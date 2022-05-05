import fs from "fs";
import path from "path";
import util from "util";
import { exec } from "child_process";
import { createHash } from "crypto";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

const fsPromises = fs.promises;
const ok = Object.keys;
// Profisifies execution of child process
const execAsync = util.promisify(exec);
// FileName - HashPair
export interface NameHashPair {
    [key: string]: string;
}

// Save FileNameHashPair
const nameHashPair: NameHashPair = {};

// Default Source Path and Target Paths
let defaultSourcesPath: string;
// let sourcesPaths: string[];

// Set to save all changed contracts or
// artifacts that are not available
const changed = new Set();

// File containing contract hash
let tracker: NameHashPair = {};

// Creates tracker file only if it doesn't exist in cache
const upsertFile = async () => {
    const dirpath = path.join(defaultSourcesPath, "../cache/cairo-files-cache.json");
    const cacheDirpath = path.join(defaultSourcesPath, "../cache");

    // Creates cache directory if it doesn"t exist
    if (!fs.existsSync(cacheDirpath)) {
        fs.mkdirSync(cacheDirpath);
    }

    if (!fs.existsSync(dirpath)) {
        // create file, if it"s not found
        await fsPromises.writeFile(dirpath, JSON.stringify({}));
    } else {
        // try to read file
        const oldNameHashPair = await fsPromises.readFile(dirpath, "utf8");
        tracker = JSON.parse(oldNameHashPair);
    }
};

// Gets hash of each .cairo file inside contracts
const getContractHash = async () => {
    try {
        // traverse directory contracts/
        const dirpath = path.join(defaultSourcesPath, "../contracts");
        const files = await fsPromises.readdir(dirpath);
        // check only cairo file extensions
        const filesList = files.filter((el) => path.extname(el).toLowerCase() === ".cairo");
        // select file name
        for (const cairoContract of filesList) {
            const data = await fsPromises.readFile(dirpath.concat(`/${cairoContract}`));
            const hash = createHash("sha256");
            hash.update(data);
            nameHashPair[`${cairoContract}`] = hash.copy().digest("hex").toString();
        }
    } catch (err) {
        console.log(err);
    }
};

// Checks artifacts availability
const checkArtifacts = async () => {
    try {
        // traverse directory starknet-artifacts/contracts
        const dirpath = path.join(defaultSourcesPath, "../starknet-artifacts/contracts");
        const files = await fsPromises.readdir(dirpath);
        for (const name of ok(nameHashPair)) {
            if (!files.includes(name)) {
                changed.add(`contracts/${name}`);
            }
        }
    } catch (err) {
        console.log(err);
    }
};

// Compile changed contracts
const compileChangedContracts = async () => {
    if (ok(nameHashPair).length === ok(tracker).length) {
        ok(nameHashPair).forEach(contractName => {
            if (nameHashPair[contractName] !== tracker[contractName]) {
                changed.add(`contracts/${contractName}`);
            }
        });
    } else {
        // Compile only that are not in tracker
        ok(nameHashPair).forEach(contractName => {
            if (nameHashPair[contractName] !== tracker[contractName]) {
                changed.add(`contracts/${contractName}`);
            }
        });
    }

    if (changed.size > 0) {
        try {
            // Compiles contracts
            console.log("Compiling contracts...");
            await execAsync(`npx hardhat starknet-compile ${[...changed].join(" ")}`);
        } catch (err) {
            console.log(err);
        }
    }
};

export const handleCache = async (args: TaskArguments, hre: HardhatRuntimeEnvironment) => {
    defaultSourcesPath = hre.config.paths.starknetSources;
    // sourcesPaths = args.paths || [defaultSourcesPath];
    await upsertFile();
    await getContractHash();
    await checkArtifacts();
    await compileChangedContracts();

    try {
        // Write to file new NameHashPair of contracts
        const dirPath = path.join(defaultSourcesPath, "../cache/cairo-files-cache.json");
        await fsPromises.writeFile(dirPath, JSON.stringify(nameHashPair, null, " "));
    } catch (err) {
        console.log(err);
    }
};
