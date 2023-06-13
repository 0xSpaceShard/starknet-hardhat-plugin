import fs from "fs";
import { glob } from "glob";
import {
    HardhatNetworkConfig,
    HardhatRuntimeEnvironment,
    HttpNetworkConfig,
    NetworkConfig,
    NetworksConfig,
    ProjectPathsConfig,
    VmLang
} from "hardhat/types";
import path from "path";
import { json, stark, CompiledContract } from "starknet";

import { handleInternalContractArtifacts } from "./account-utils";
import {
    ABI_SUFFIX,
    ALPHA_MAINNET,
    ALPHA_MAINNET_INTERNALLY,
    ALPHA_TESTNET,
    ALPHA_TESTNET_INTERNALLY,
    ALPHA_TESTNET_2,
    ALPHA_TESTNET_2_INTERNALLY,
    DEFAULT_DEVNET_CAIRO_VM,
    DEFAULT_STARKNET_ACCOUNT_PATH,
    INTEGRATED_DEVNET,
    INTEGRATED_DEVNET_INTERNALLY,
    StarknetChainId,
    UDC_ADDRESS
} from "./constants";
import { getContractFactoryUtil } from "./extend-utils";
import { StarknetPluginError } from "./starknet-plugin-error";
import { Abi, AbiEntry, CairoFunction } from "./starknet-types";
import { Cairo1ContractClass, ContractClassConfig, Numeric, StarknetContract } from "./types";

/**
 * Replaces Starknet specific terminology with the terminology used in this plugin.
 *
 * @param msg the log message to be adapted
 * @returns the log message with adaptation replacements
 */
export function adaptLog(msg: string): string {
    return msg
        .replace("--network", "--starknet-network")
        .replace("gateway_url", "gateway-url")
        .replace("--account_contract", "--account-contract")
        .replace("the 'starknet deploy_account' command", "'hardhat starknet-deploy-account'")
        .replace("the 'new_account' command", "'hardhat starknet-new-account'")
        .split(".\nTraceback (most recent call last)")[0] // remove duplicated log
        .replace(/\\n/g, "\n"); // use newlines from json response for formatting
}

export function getDefaultHttpNetworkConfig(
    url: string,
    verificationUrl: string,
    verifiedUrl: string,
    starknetChainId: StarknetChainId
): HttpNetworkConfig {
    return {
        url,
        verificationUrl,
        verifiedUrl,
        starknetChainId,
        accounts: undefined,
        gas: undefined,
        gasMultiplier: undefined,
        gasPrice: undefined,
        httpHeaders: undefined,
        timeout: undefined
    };
}

export function getDefaultHardhatNetworkConfig(url: string): HardhatNetworkConfig {
    return {
        url,
        chainId: undefined,
        gas: undefined,
        gasPrice: undefined,
        gasMultiplier: undefined,
        hardfork: undefined,
        mining: undefined,
        accounts: undefined,
        blockGasLimit: undefined,
        minGasPrice: undefined,
        throwOnTransactionFailures: undefined,
        throwOnCallFailures: undefined,
        allowUnlimitedContractSize: undefined,
        initialDate: undefined,
        loggingEnabled: undefined,
        chains: undefined
    };
}

export async function traverseFiles(traversable: string, fileCriteria = "*") {
    let paths: string[] = [];
    if (fs.lstatSync(traversable).isDirectory()) {
        paths = await glob(path.join(traversable, "**", fileCriteria));
    } else {
        paths.push(traversable);
    }
    const files = paths.filter((file) => fs.lstatSync(file).isFile());
    return files;
}

export function getArtifactPath(sourcePath: string, paths: ProjectPathsConfig): string {
    const rootRegex = new RegExp("^" + paths.root);
    const suffix = sourcePath.replace(rootRegex, "");
    return path.join(paths.starknetArtifacts, suffix);
}

/**
 * Adapts path relative to the root of the project and
 * tilde will be resolved to homedir
 * @param root string representing the root path set on hre or config
 * @param newPath string representing the path provided by the user
 * @returns adapted path
 */
export function adaptPath(root: string, newPath: string): string {
    let adaptedPath = newPath;
    if (newPath[0] === "~") {
        adaptedPath = path.normalize(path.join(process.env.HOME, newPath.slice(1)));
    } else if (!path.isAbsolute(newPath)) {
        adaptedPath = path.normalize(path.join(root, newPath));
    }
    return adaptedPath;
}

export function checkArtifactExists(artifactsPath: string): void {
    if (!fs.existsSync(artifactsPath)) {
        const msg = `Artifact expected to be at ${artifactsPath}, but not found. Consider recompiling your contracts.`;
        throw new StarknetPluginError(msg);
    }
}

/**
 * Extracts the network config from `hre.config.networks` according to `networkName`.
 * @param networkName The name of the network
 * @param networks Object holding network configs
 * @param origin Short string describing where/how `networkName` was specified
 * @returns Network config corresponding to `networkName`
 */
export function getNetwork<N extends NetworkConfig>(
    networkName: string,
    networks: NetworksConfig,
    origin: string
): N {
    if (isMainnet(networkName)) {
        networkName = ALPHA_MAINNET_INTERNALLY;
    } else if (isTestnet(networkName)) {
        networkName = ALPHA_TESTNET_INTERNALLY;
    } else if (isTestnetTwo(networkName)) {
        networkName = ALPHA_TESTNET_2_INTERNALLY;
    } else if (isStarknetDevnet(networkName)) {
        networkName = INTEGRATED_DEVNET_INTERNALLY;
    }

    const network = <N>networks[networkName];

    if (!network) {
        const available = Object.keys(networks).join(", ");
        const msg = `Invalid network provided in ${origin}: ${networkName}.\nValid hardhat networks: ${available}`;
        throw new StarknetPluginError(msg);
    }

    if (!network.url) {
        throw new StarknetPluginError(`Cannot use network ${networkName}. No "url" specified.`);
    }
    network.starknetChainId ||= StarknetChainId.TESTNET;
    network.vmLang ||= DEFAULT_DEVNET_CAIRO_VM as VmLang;

    return network;
}

function isTestnet(networkName: string): boolean {
    return networkName === ALPHA_TESTNET || networkName === ALPHA_TESTNET_INTERNALLY;
}

function isTestnetTwo(networkName: string): boolean {
    return networkName === ALPHA_TESTNET_2 || networkName === ALPHA_TESTNET_2_INTERNALLY;
}

function isMainnet(networkName: string): boolean {
    return networkName === ALPHA_MAINNET || networkName === ALPHA_MAINNET_INTERNALLY;
}

export function isStarknetDevnet(networkName: string): boolean {
    return networkName === INTEGRATED_DEVNET || networkName === INTEGRATED_DEVNET_INTERNALLY;
}

export async function findPath(traversable: string, pathSegment: string) {
    // Relative path to artifacts can be resolved now
    const resolvedPath = path.resolve(path.join(traversable, pathSegment));
    if (fs.existsSync(resolvedPath) && fs.lstatSync(resolvedPath).isFile()) {
        return resolvedPath;
    }

    let files = await traverseFiles(traversable);
    files = files.filter((f) => f.endsWith(pathSegment));
    if (files.length == 0) {
        return null;
    } else if (files.length == 1) {
        return files[0];
    } else {
        const msg =
            "More than one file was found because the path provided is ambiguous, please specify a relative path";
        throw new StarknetPluginError(msg);
    }
}

/**
 *
 * @param accountPath Path where the account file is saved
 * @param hre The HardhatRuntimeEnvironment
 * @returns Absolute path where the account file is saved
 */
export function getAccountPath(accountPath: string, hre: HardhatRuntimeEnvironment) {
    let accountDir = accountPath || DEFAULT_STARKNET_ACCOUNT_PATH;

    // Adapt path to be absolute
    if (accountDir[0] === "~") {
        accountDir = path.normalize(path.join(process.env.HOME, accountDir.slice(1)));
    } else if (!path.isAbsolute(accountDir)) {
        const root = hre.config.paths.root;
        accountDir = path.normalize(path.join(root, accountDir));
    }
    return accountDir;
}

export function copyWithBigint<T>(object: unknown): T {
    return JSON.parse(
        JSON.stringify(object, (_key, value) =>
            typeof value === "bigint" ? value.toString() : value
        )
    );
}

export function getImageTagByArch(tag: string): string {
    // Check CPU architecture
    const arch = process.arch;
    if (arch === "arm64" && !tag.endsWith("-arm")) {
        tag = `${tag}-arm`;
    }
    return tag;
}

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Log a yellow message to STDERR.
 * @param message
 */
export function warn(message: string): void {
    console.warn("\x1b[33m%s\x1b[0m", message);
}

/**
 * Converts BigInt to 0x-prefixed hex string
 * @param numeric
 */
export function numericToHexString(numeric: Numeric): string {
    return "0x" + BigInt(numeric).toString(16);
}

/**
 * @returns random salt
 */
export function generateRandomSalt(): string {
    return stark.randomAddress();
}

/**
 * Global handler of UDC
 */
export class UDC {
    private static instance: StarknetContract;

    /**
     * Returns the UDC singleton.
     */
    static async getInstance() {
        if (!UDC.instance) {
            const hre = await import("hardhat");
            const contractPath = handleInternalContractArtifacts(
                "OpenZeppelinUDC", // dir name
                "UDC", // file name
                "0.5.0", // version
                hre
            );
            const udcContractFactory = await getContractFactoryUtil(hre, contractPath);
            UDC.instance = udcContractFactory.getContractAt(UDC_ADDRESS);
        }
        return UDC.instance;
    }
}

export function readContract(contractPath: string) {
    const parsedContract = json.parse(
        fs.readFileSync(contractPath).toString("ascii")
    ) as CompiledContract;
    return {
        ...parsedContract,
        program: stark.compressProgram(parsedContract.program)
    };
}

export function readCairo1Contract(contractPath: string) {
    const parsedContract = json.parse(fs.readFileSync(contractPath).toString("ascii"));
    const { contract_class_version, entry_points_by_type, sierra_program } = parsedContract;

    const contract = new Cairo1ContractClass({
        abiPath: path.join(
            path.dirname(contractPath),
            `${path.parse(contractPath).name}${ABI_SUFFIX}`
        ),
        sierraProgram: stark.compressProgram(formatSpaces(JSON.stringify(sierra_program))),
        entryPointsByType: entry_points_by_type,
        contractClassVersion: contract_class_version
    } as ContractClassConfig);

    return contract;
}

/**
 * Json string is transformed into a formatted string without newlines.
 * @param json string
 * @returns string
 */
export function formatSpaces(json: string): string {
    let insideQuotes = false;
    let newString = "";
    for (const char of json) {
        // eslint-disable-next-line
        if (char === '"' && newString.endsWith("\\") === false) {
            insideQuotes = !insideQuotes;
        }
        if (insideQuotes) {
            newString += char;
        } else {
            newString += char === ":" ? ": " : char === "," ? ", " : char;
        }
    }
    return newString;
}

export function bnToDecimalStringArray(rawCalldata: bigint[]) {
    return rawCalldata.map((x) => x.toString(10));
}

export function estimatedFeeToMaxFee(amount?: bigint, overhead = 0.5) {
    overhead = Math.round((1 + overhead) * 100);
    return (amount * BigInt(overhead)) / BigInt(100);
}

export function findConstructor(abi: Abi, predicate: (entry: AbiEntry) => boolean): CairoFunction {
    for (const abiEntryName in abi) {
        const abiEntry = abi[abiEntryName];
        if (predicate(abiEntry)) {
            return <CairoFunction>abiEntry;
        }
    }

    return undefined;
}
