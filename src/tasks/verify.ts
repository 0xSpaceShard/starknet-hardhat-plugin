import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import FormData = require("form-data");
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatRuntimeEnvironment, HttpNetworkConfig, TaskArguments } from "hardhat/types";

import { PLUGIN_NAME, ALPHA_TESTNET } from "../constants";
import { getNetwork } from "../utils";

/**
 * Extracts the verification URL assigned to the network provided.
 * If no `networkName` is provided, defaults to Alpha testnet.
 * If `networkName` is provided, but not supported for verification, an error is thrown.
 * @param networkName the name of the network
 * @param hre the runtime environment from which network data is extracted
 * @param origin short string describing where/how `networkName` was specified
 */
function getVerificationNetwork(
    networkName: string,
    hre: HardhatRuntimeEnvironment,
    origin: string
) {
    networkName ||= ALPHA_TESTNET;
    const network = getNetwork<HttpNetworkConfig>(networkName, hre.config.networks, origin);
    if (!network.verificationUrl) {
        throw new HardhatPluginError(
            PLUGIN_NAME,
            `Network ${networkName} does not support Voyager verification.`
        );
    }
    return network;
}

export async function starknetVoyagerAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const network = getVerificationNetwork(args.starknetNetwork, hre, "--starknet-network");
    const voyagerUrl = `${network.verificationUrl}${args.address}/code`;
    const verifiedUrl = `${network.verifiedUrl}${args.address}#code`;

    let isVerified = false;
    try {
        const resp = await axios.get(voyagerUrl);
        const data = resp.data;

        if (data.contract) {
            if (data.contract.length > 0 || Object.keys(data.contract).length > 0) {
                isVerified = true;
            }
        }
    } catch (error) {
        const msg =
            "Something went wrong while checking if the contract has already been verified.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (isVerified) {
        console.log(`Contract at address ${args.address} has already been verified`);
        console.log(`Check it out on Voyager: ${verifiedUrl}`);
    } else {
        await handleContractVerification(args, voyagerUrl, verifiedUrl, hre);
    }
}

function getMainVerificationPath(contractPath: string, root: string) {
    if (!path.isAbsolute(contractPath)) {
        contractPath = path.normalize(path.join(root, contractPath));
        if (!fs.existsSync(contractPath)) {
            throw new HardhatPluginError(PLUGIN_NAME, `File ${contractPath} does not exist`);
        }
    }
    return contractPath;
}

async function handleContractVerification(
    args: TaskArguments,
    voyagerUrl: string,
    verifiedUrl: string,
    hre: HardhatRuntimeEnvironment
) {
    // Set main contract path
    const mainPath = getMainVerificationPath(args.path, hre.config.paths.root);
    const paths = [mainPath];

    const bodyFormData = new FormData();
    bodyFormData.append("contract-name", path.parse(mainPath).base);

    // Dependencies (non-main contracts) are in args.paths
    if (args.paths) {
        paths.push(...args.paths);
    }

    handleMultiPartContractVerification(bodyFormData, paths, hre.config.paths.root);

    await axios
        .post(voyagerUrl, bodyFormData.getBuffer(), {
            headers: bodyFormData.getHeaders()
        })
        .catch(() => {
            throw new HardhatPluginError(
                PLUGIN_NAME,
                `\
Could not verify the contract at address ${args.address}.
It is hard to tell exactly what happened, but possible reasons include:
- Deployment transaction hasn't been accepted or indexed yet (check its tx_status or try in a minute)
- Wrong contract address
- Wrong files provided
- Wrong main contract chosen (first after --path)
- Voyager is down`
            );
        });

    console.log(`Contract has been successfuly verified at address ${args.address}`);
    console.log(`Check it out on Voyager: ${verifiedUrl}`);
}

function handleMultiPartContractVerification(
    bodyFormData: FormData,
    paths: string[],
    root: string
) {
    paths.forEach(function (item: string, index: number) {
        if (!path.isAbsolute(item)) {
            paths[index] = path.normalize(path.join(root, item));
            if (!fs.existsSync(paths[index])) {
                throw new HardhatPluginError(PLUGIN_NAME, `File ${paths[index]} does not exist`);
            }
        }
        bodyFormData.append("file" + index, fs.readFileSync(paths[index]), {
            filename: paths[index],
            contentType: "application/octet-stream"
        });
    });
}
