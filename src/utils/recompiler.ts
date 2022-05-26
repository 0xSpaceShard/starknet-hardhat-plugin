import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { starknetCompileAction } from "../task-actions";
import { getArtifactPath, traverseFiles } from "../utils";
import { ABI_SUFFIX } from "../constants";

const fsPromises = fs.promises;

interface ContractData {
    contentHash: string;
    outputPath: string;
    abiPath: string;
}

// FileName - HashPair
interface CacheEntry {
    [key: string]: ContractData;
}

// Cache file name
const CACHE_FILE_NAME = "cairo-files-cache.json";

// Creates cache file only if it doesn't exist in cache
const upsertFile = async (cacheDirName: string): Promise<CacheEntry> => {
    const cacheFile = path.join(cacheDirName, CACHE_FILE_NAME);
    const cacheDirpath = path.join(cacheDirName);

    // Creates cache directory if it doesn't exist
    if (!fs.existsSync(cacheDirpath)) {
        fs.mkdirSync(cacheDirpath);
    }

    if (!fs.existsSync(cacheFile)) {
        // create file, if it's not found
        await fsPromises.writeFile(cacheFile, JSON.stringify({}));
        return {};
    } else {
        // try to read file
        const oldFile = await fsPromises.readFile(cacheFile);
        const oldCacheEntry: CacheEntry = JSON.parse(oldFile.toString() || "{}");
        return oldCacheEntry;
    }
};

// Gets hash of each .cairo file inside contracts
const getContractHash = async (hre: HardhatRuntimeEnvironment): Promise<CacheEntry> => {
    const { starknetSources: defaultSourcesPath } = hre.config.paths;

    const sourceRegex = new RegExp("^" + defaultSourcesPath + "/");
    const artifactsDir = getArtifactPath(defaultSourcesPath, hre);

    const newCacheEntry: CacheEntry = {};
    // get soucrces from source path. check only cairo file extensions
    const filesList = await traverseFiles(defaultSourcesPath, "*.cairo");
    // select file name
    for (const cairoContract of filesList) {
        const data = await fsPromises.readFile(cairoContract);
        const hash = createHash("sha256");
        hash.update(data);
        const suffix = cairoContract.replace(sourceRegex, "");

        const fileName = path.basename(suffix, ".cairo");
        const abiPath = path.join(artifactsDir, suffix, `${fileName}${ABI_SUFFIX}`);
        const outputPath = path.join(artifactsDir, suffix, `${fileName}.json`);

        newCacheEntry[cairoContract] = {
            contentHash: hash.digest("hex").toString(),
            outputPath: newCacheEntry[cairoContract] ? newCacheEntry[cairoContract].outputPath : outputPath,
            abiPath: newCacheEntry[cairoContract] ? newCacheEntry[cairoContract].abiPath : abiPath
        };
    }

    return newCacheEntry;
};

// Gets cache entry of a given cairo file plus artifacts
const getHashEntry = async (
    file: string,
    output: string,
    abi: string
): Promise<CacheEntry> => {
    const data = await fsPromises.readFile(file);
    const hash = createHash("sha256");
    hash.update(data);

    const newCacheEntry: CacheEntry = {};
    newCacheEntry[file] = {
        contentHash: hash.digest("hex").toString(),
        outputPath: output,
        abiPath: abi
    };

    return newCacheEntry;
};

// Updates cache entry with new contracts
const getUpdatedCashEntry = (
    oldCacheEntry: CacheEntry,
    newCacheEntry: CacheEntry
): CacheEntry => {
    const updatedCacheEntry: CacheEntry = oldCacheEntry;
    for (const contractName in newCacheEntry) {
        if (oldCacheEntry[contractName]?.contentHash !== newCacheEntry[contractName].contentHash) {
            updatedCacheEntry[contractName] = newCacheEntry[contractName];
        }
    }

    return updatedCacheEntry;
};

// Checks artifacts availability
const checkArtifacts = async (
    hre: HardhatRuntimeEnvironment,
    newCacheEntry: CacheEntry
): Promise<Set<string>> => {
    // Set to save contracts with changed content & unavailable artifacts
    const changed: Set<string> = new Set();
    const { starknetSources: defaultSourcesPath } = hre.config.paths;
    const artifactsDir = getArtifactPath(defaultSourcesPath, hre);
    // traverse on artifacts directory
    const artifactsList = await traverseFiles(artifactsDir, "*.json");
    for (const name in newCacheEntry) {
        const outputPath = newCacheEntry[name].outputPath;
        const abiPath = newCacheEntry[name].abiPath;
        if (!artifactsList.includes(outputPath) || !artifactsList.includes(abiPath)) {
            changed.add(name);
        }
    }

    return changed;
};

// Compile changed contracts
const compileChangedContracts = async (
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    newCacheEntry: CacheEntry,
    oldCacheEntry: CacheEntry,
    changed: Set<string>
): Promise<void> => {
    for (const contractName in newCacheEntry) {
        // Add new contracts that are not in cache before
        if (!oldCacheEntry[contractName]) {
            changed.add(contractName);
        }

        // Add contracts that contiain a change in content
        if (newCacheEntry[contractName].contentHash !== oldCacheEntry[contractName]?.contentHash) {
            changed.add(contractName);
        }
    }

    if (changed.size > 0) {
        // Compiles contracts
        console.log("Compiling contracts...");
        const copyPaths = args.paths;
        args.paths = [...changed];
        await starknetCompileAction(args, hre);
        // Restore paths
        args.paths = copyPaths;
    }
};

// Handles cache on Starknet cli calls
export const handleCache = async (args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<boolean> => {
    // If recompile is not enabled, do nothing
    if (!hre.userConfig?.starknet?.recompile) return true;

    // Get cache directory from hre.config
    const { cache: cacheDirName } = hre.config.paths;

    try {
        const oldCacheEntry = await upsertFile(cacheDirName);
        const newCacheEntry = await getContractHash(hre);
        const changedContracts = await checkArtifacts(hre, newCacheEntry);
        await compileChangedContracts(args, hre, newCacheEntry, oldCacheEntry, changedContracts);

        return true;
    } catch (error) {
        // If there is an error, do not recompile
        console.error(error);
        return false;
    }
};

// Save cache entry to file
export const saveCacheEntry = async (
    file: string,
    output: string,
    abi: string,
    hre: HardhatRuntimeEnvironment
): Promise<void> => {
    const { cache: cacheDirName } = hre.config.paths;
    const oldCacheEntry = await upsertFile(cacheDirName);
    const newCacheEntry = await getHashEntry(file, output, abi);
    const updatedCacheEntry = getUpdatedCashEntry(oldCacheEntry, newCacheEntry);
    const cacheFile = path.join(cacheDirName, CACHE_FILE_NAME);
    await fsPromises.writeFile(cacheFile, JSON.stringify(updatedCacheEntry, null, " "));
};
