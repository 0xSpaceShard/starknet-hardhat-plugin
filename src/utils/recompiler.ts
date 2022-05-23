import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { starknetCompileAction } from "../task-actions";
import { traverseFiles } from "../utils";

const fsPromises = fs.promises;

// FileName - HashPair
interface NameHashPair {
    [key: string]: string;
}

// Cache file name
const CACHE_FILE_NAME = "cairo-files-cache.json";

// Creates cache file only if it doesn't exist in cache
const upsertFile = async (cacheDirName: string): Promise<NameHashPair> => {
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
        const oldNameHashPair: NameHashPair = JSON.parse(oldFile.toString() || "{}");
        return oldNameHashPair;
    }
};

// Gets hash of each .cairo file inside contracts
const getContractHash = async (defaultSourcesPath: string): Promise<NameHashPair> => {
    const newNameHashPair: NameHashPair = {};
    // get soucrces from source path. check only cairo file extensions
    const filesList = await traverseFiles(defaultSourcesPath, "*.cairo");
    // select file name
    for (const cairoContract of filesList) {
        const data = await fsPromises.readFile(cairoContract);
        const hash = createHash("sha256");
        hash.update(data);
        newNameHashPair[cairoContract] = hash.digest("hex").toString();
    }

    return newNameHashPair;
};

// Checks artifacts availability
const checkArtifacts = async (
    defaultSourcesPath: string,
    starknetArtifacts: string,
    newNameHashPair: NameHashPair,
    changed: Set<string>
): Promise<void> => {
    // traverse on artifacts directory
    const dirpath = path.join(starknetArtifacts, "contracts");
    const files = await fsPromises.readdir(dirpath);
    for (const name in newNameHashPair) {
        if (!files.includes(name)) {
            changed.add(`${defaultSourcesPath}/${name}`);
        }
    }
};

// Compile changed contracts
const compileChangedContracts = async (
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment,
    newNameHashPair: NameHashPair,
    oldNameHashPair: NameHashPair,
    changed: Set<string>
): Promise<boolean> => {
    const defaultSourcesPath = hre.config.paths.starknetSources;
    const getKeys = Object.keys;

    getKeys(newNameHashPair).forEach(contractName => {
        // Add new contracts that are not in cache before
        if (!oldNameHashPair[contractName]) {
            changed.add(`${defaultSourcesPath}/${contractName}`);
        }

        // Add contracts that contiain a change in content
        if (newNameHashPair[contractName] !== oldNameHashPair[contractName]) {
            changed.add(`${defaultSourcesPath}/${contractName}`);
        }
    });

    if (changed.size > 0) {
        // Compiles contracts
        console.log("Compiling contracts...");
        args.paths = [...changed];
        await starknetCompileAction(args, hre);
    }

    return true;
};

export const handleCache = async (args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<boolean> => {
    // If recompile is not enabled, do nothing
    if (!hre.userConfig?.starknet?.recompile || hre.userConfig?.starknet?.recompile === undefined) return true;

    // Get cache directory, default source directory and artifacts directory from hre.config
    const { starknetSources: defaultSourcesPath, cache: cacheDirName, starknetArtifacts } = hre.config.paths;

    // Set to save contracts with changed content & unavailable artifacts
    const changed: Set<string> = new Set();

    const oldNameHashPair = await upsertFile(cacheDirName);
    const newNameHashPair = await getContractHash(defaultSourcesPath);
    await checkArtifacts(defaultSourcesPath, starknetArtifacts, newNameHashPair, changed);
    const compiledSuccessfully = await compileChangedContracts(args, hre, newNameHashPair, oldNameHashPair, changed);
    if (!compiledSuccessfully) return false;

    // Write to file new NameHashPair of contracts
    const cacheFile = path.join(cacheDirName, CACHE_FILE_NAME);
    await fsPromises.writeFile(cacheFile, JSON.stringify(newNameHashPair, null, " "));
    return true;
};
