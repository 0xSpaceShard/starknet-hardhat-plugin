import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";
import { starknetCompileAction } from "../task-actions";

const fsPromises = fs.promises;

// FileName - HashPair
interface NameHashPair {
    [key: string]: string;
}
// Cache file name
export const CACHE_FILE_NAME = "cairo-files-cache.json";
// File containing contract hash
let oldNameHashPair: NameHashPair = {};
// New FileNameHashPair
const newNameHashPair: NameHashPair = {};
// Set to save contracts with changed content & unavailable artifacts
const changed = new Set<string>();

// Creates cache file only if it doesn't exist in cache
const upsertFile = async (cacheDirName: string) => {
    const dirpath = path.join(cacheDirName, CACHE_FILE_NAME);
    const cacheDirpath = path.join(cacheDirName);

    // Creates cache directory if it doesn't exist
    if (!fs.existsSync(cacheDirpath)) {
        fs.mkdirSync(cacheDirpath);
    }

    if (!fs.existsSync(dirpath)) {
        // create file, if it's not found
        await fsPromises.writeFile(dirpath, JSON.stringify({}));
    } else {
        // try to read file
        const oldFile = await fsPromises.readFile(dirpath);
        oldNameHashPair = JSON.parse(oldFile.toString() || "{}");
    }
};

// Gets hash of each .cairo file inside contracts
const getContractHash = async (defaultSourcesPath: string) => {
    try {
        // traverse directory contracts/
        const files = await fsPromises.readdir(defaultSourcesPath);
        // check only cairo file extensions
        const filesList = files.filter((el) => path.extname(el).toLowerCase() === ".cairo");
        // select file name
        for (const cairoContract of filesList) {
            const data = await fsPromises.readFile(defaultSourcesPath.concat(`/${cairoContract}`));
            const hash = createHash("sha256");
            hash.update(data);
            newNameHashPair[cairoContract] = hash.digest("hex").toString();
        }
    } catch (err) {
        console.log(err);
    }
};

// Checks artifacts availability
const checkArtifacts = async (defaultSourcesPath: string, starknetArtifacts: string) => {
    try {
        // traverse on artifacts directory
        const dirpath = path.join(starknetArtifacts, "contracts");
        const files = await fsPromises.readdir(dirpath);
        for (const name in newNameHashPair) {
            if (!files.includes(name)) {
                changed.add(`${defaultSourcesPath}/${name}`);
            }
        }
    } catch (err) {
        console.log(err);
    }
};

// Compile changed contracts
const compileChangedContracts = async (args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<boolean> => {
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
        try {
            // Compiles contracts
            console.log("Compiling contracts...");
            args.paths = [...changed];
            await starknetCompileAction(args, hre);
        } catch (err) {
            console.log(err);
            return false;
        }
    }
    return true;
};

export const handleCache = async (args: TaskArguments, hre: HardhatRuntimeEnvironment): Promise<boolean> => {
    const { starknetSources: defaultSourcesPath, cache: cacheDirName, starknetArtifacts } = hre.config.paths;

    await upsertFile(cacheDirName);
    await getContractHash(defaultSourcesPath);
    await checkArtifacts(defaultSourcesPath, starknetArtifacts);

    const compiledSuccessfully = await compileChangedContracts(args, hre);
    if (!compiledSuccessfully) return false;

    try {
        // Write to file new NameHashPair of contracts
        const dirPath = path.join(cacheDirName, CACHE_FILE_NAME);
        await fsPromises.writeFile(dirPath, JSON.stringify(newNameHashPair, null, " "));
        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
};
