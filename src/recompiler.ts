import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { HardhatRuntimeEnvironment, ProjectPathsConfig, TaskArguments } from "hardhat/types";
import { starknetCompileAction } from "./task-actions";
import { getArtifactPath, traverseFiles } from "./utils";
import { ABI_SUFFIX } from "./constants";

const fsPromises = fs.promises;

interface ContractData {
    contentHash: string;
    outputPath: string;
    abiPath: string;
    cairoPath?: string;
    accountContract?: boolean;
    disableHintValidation?: boolean;
}

// FileName - HashPair
interface Cache {
    [key: string]: ContractData;
}

// Cache file name
const CACHE_FILE_NAME = "cairo-files-cache.json";

// Creates cache file only if it doesn't exist in cache
const upsertFile = async (cacheDirName: string): Promise<Cache> => {
    const cacheFile = path.join(cacheDirName, CACHE_FILE_NAME);
    const cacheDirpath = path.join(cacheDirName);

    // Creates cache directory if it doesn't exist
    if (!fs.existsSync(cacheDirpath)) {
        fs.mkdirSync(cacheDirpath, { recursive: true });
    }

    if (!fs.existsSync(cacheFile)) {
        // create file, if it's not found
        await fsPromises.writeFile(cacheFile, JSON.stringify({}));
        return {};
    } else {
        // try to read file
        const oldFile = await fsPromises.readFile(cacheFile);
        const oldCacheEntry: Cache = JSON.parse(oldFile.toString() || "{}");
        return oldCacheEntry;
    }
};

// Gets hash of each .cairo file inside contracts
const getContractHash = async (paths: ProjectPathsConfig): Promise<Cache> => {
    const { starknetSources: defaultSourcesPath } = paths;

    const sourceRegex = new RegExp("^" + defaultSourcesPath + "/");
    const artifactsDir = getArtifactPath(defaultSourcesPath, paths);

    const newCacheEntry: Cache = {};
    // Get soucrces from source path. Check only cairo file extensions
    const filesList = await traverseFiles(defaultSourcesPath, "*.cairo");
    // Select file name
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
            outputPath,
            abiPath
        };
    }

    return newCacheEntry;
};

// Gets cache entry of a given cairo file plus artifacts
const getCacheEntry = async (
    file: string,
    output: string,
    abi: string,
    args?: TaskArguments,
    cairoPath?: string
): Promise<Cache> => {
    const data = await fsPromises.readFile(file);
    const hash = createHash("sha256");
    hash.update(data);

    const newCacheEntry: Cache = {};
    newCacheEntry[file] = {
        contentHash: hash.digest("hex").toString(),
        outputPath: output,
        abiPath: abi
    };

    if (args?.disableHintValidation) {
        newCacheEntry[file].disableHintValidation = true;
    }

    if (args?.accountContract) {
        newCacheEntry[file].accountContract = true;
    }

    if (cairoPath) {
        newCacheEntry[file].cairoPath = args.cairoPath;
    }

    return newCacheEntry;
};

// Updates cache entry with new contracts
const getUpdatedCache = (
    oldCache: Cache,
    newCacheEntry: Cache
): Cache => {
    const updatedCacheEntry: Cache = oldCache;
    for (const contractName in newCacheEntry) {
        if (oldCache[contractName]?.contentHash !== newCacheEntry[contractName].contentHash) {
            updatedCacheEntry[contractName] = newCacheEntry[contractName];
        }
    }

    return updatedCacheEntry;
};

// Checks artifacts availability
const checkArtifacts = async (
    paths: ProjectPathsConfig,
    newCacheEntry: Cache
): Promise<Set<string>> => {
    // Set to save contracts with changed content & unavailable artifacts
    const changed: Set<string> = new Set();
    const { starknetSources: defaultSourcesPath } = paths;
    const artifactsDir = getArtifactPath(defaultSourcesPath, paths);
    // Traverse on artifacts directory
    // Create if it doesn't exist
    if (!fs.existsSync(artifactsDir)) {
        fs.mkdirSync(artifactsDir, { recursive: true });
    }

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
    hre: HardhatRuntimeEnvironment,
    newCacheEntry: Cache,
    changed: Set<string>
): Promise<void> => {
    for (const changedContract of changed) {
        const entry = newCacheEntry[changedContract];
        const compileArguments: TaskArguments = {
            paths: [changedContract],
            disableHintValidation: entry?.disableHintValidation,
            accountContract: entry?.accountContract,
            carioPath: entry?.cairoPath
        };

        await starknetCompileAction(compileArguments, hre);
    }
};

// Updated set with changed and new contracts
const updateSet = (
    cache: Cache,
    newCacheEntry: Cache,
    changed: Set<string>
): Set<string> => {
    for (const contractName in newCacheEntry) {
        // Add new contracts that are not in cache before
        if (!cache[contractName]) {
            changed.add(contractName);
            continue;
        }

        // Add contracts that contiain a change in content
        if (newCacheEntry[contractName].contentHash !== cache[contractName].contentHash) {
            changed.add(contractName);
        }
    }

    return changed;
}

// Handles cache on Starknet cli calls
export const handleCache = async (hre: HardhatRuntimeEnvironment) => {
    // If recompile is not enabled, do nothing
    if (!hre.userConfig?.starknet?.recompile) return;

    // Get cache directory from hre.config
    const { cache: cacheDirName } = hre.config.paths;

    try {
        const oldCache = await upsertFile(cacheDirName);
        const newCacheEntry = await getContractHash(hre.config.paths);
        const changedContracts = await checkArtifacts(hre.config.paths, newCacheEntry);
        const updatedSet = updateSet(oldCache, newCacheEntry, changedContracts);
        await compileChangedContracts(hre, newCacheEntry, updatedSet);
    } catch (error) {
        // If there is an error, do not recompile
        console.error(error);
        process.exit(1);
    }
};

// Updates cache with new contract and artifacts
export const updateCache = async (
    file: string,
    output: string,
    abi: string,
    hre: HardhatRuntimeEnvironment,
    args: TaskArguments,
    cairoPath?: string
): Promise<void> => {
    const { cache: cacheDirName } = hre.config.paths;
    const oldCache = await upsertFile(cacheDirName);
    const newCacheEntry = await getCacheEntry(file, output, abi, args, cairoPath);
    const updatedCache = getUpdatedCache(oldCache, newCacheEntry);
    const cacheFile = path.join(cacheDirName, CACHE_FILE_NAME);
    await fsPromises.writeFile(cacheFile, JSON.stringify(updatedCache, null, " "));
};
