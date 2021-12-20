import * as path from "path";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment, HttpNetworkConfig } from "hardhat/types";
import { ABI_SUFFIX, DEFAULT_STARKNET_NETWORK, PLUGIN_NAME, SHORT_STRING_MAX_CHARACTERS } from "./constants";
import { StarknetContractFactory } from "./types";
import { checkArtifactExists, traverseFiles } from "./utils";

async function findPath(traversable: string, name: string) {
    let files = await traverseFiles(traversable);
    files = files.filter(f => f.endsWith(name));
    if (files.length == 0){
        return null;
    }
    else if (files.length == 1){
        return files[0];
    }
    else {
        const msg = "More than one file was found because the path provided is ambiguous, please specify a relative path";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

export async function getContractFactoryUtil (hre: HardhatRuntimeEnvironment, contractPath:string) {
    const artifactsPath = hre.config.paths.starknetArtifacts;
    checkArtifactExists(artifactsPath);

    contractPath = contractPath.replace(/\.[^/.]+$/, "");

    let searchTarget = path.join(`${contractPath}.cairo`, `${path.basename(contractPath)}.json`);
    const metadataPath = await findPath(artifactsPath, searchTarget);
    if (!metadataPath) {
        throw new HardhatPluginError(PLUGIN_NAME, `Could not find metadata for ${contractPath}`);
    }

    searchTarget = path.join(`${contractPath}.cairo`, `${path.basename(contractPath)}${ABI_SUFFIX}`);
    const abiPath = await findPath(artifactsPath, searchTarget);
    if (!abiPath) {
        throw new HardhatPluginError(PLUGIN_NAME, `Could not find ABI for ${contractPath}`);
    }

    const testNetworkName = hre.config.mocha.starknetNetwork || DEFAULT_STARKNET_NETWORK;
    const testNetwork: HttpNetworkConfig = <HttpNetworkConfig>hre.config.networks[testNetworkName];
    if (!testNetwork) {
        const msg = `Network ${testNetworkName} is specified under "mocha.starknetNetwork", but not defined in "networks".`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (!testNetwork.url) {
        throw new HardhatPluginError(PLUGIN_NAME, `Cannot use network ${testNetworkName}. No "url" specified.`);
    }

    return new StarknetContractFactory({
        starknetWrapper: hre.starknetWrapper,
        metadataPath,
        abiPath,
        gatewayUrl: testNetwork.url,
        feederGatewayUrl: testNetwork.url
    });
}

export function stringToBigIntUtil(convertableString: string) {
    if(convertableString.length > SHORT_STRING_MAX_CHARACTERS) {
        const msg = `Strings must have a max of ${SHORT_STRING_MAX_CHARACTERS} characters.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
    
    if(!/^[\x00-\x7F]*$/.test(convertableString)){
        const msg = "Input string contains an invalid ASCII character.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    const charArray = convertableString.split("").map(c => c.toString().charCodeAt(0).toString(16));
    return BigInt("0x" + charArray.join(""));
}

export function bigIntToStringUtil(convertableBigInt: BigInt){
    return Buffer.from(convertableBigInt.toString(16), 'hex').toString();
}