import axios from "axios";
import { HardhatPluginError } from "hardhat/plugins";
import { Devnet, HardhatRuntimeEnvironment } from "hardhat/types";

import { PLUGIN_NAME } from "./constants";
import { getNetwork } from "./utils";

interface L1Message {
    address: string,
    args: {
        from_address: string,
        nonce: number,
        payload: Array<number>,
        selector: string,
        to_address: string
    },
    blockHash: string,
    blockNumber: number,
    event: string,
    logIndex: number,
    transactionHash: string,
    transactionIndex: number
}

interface L2Message {
    from_address: string;
    to_address: string;
    payload: Array<string>;
}

export interface FlushResponse {
    l1_provider: string;
    consumed_messages: {
        from_l1: Array<L1Message>;
        from_l2: Array<L2Message>;
    }
}

export interface LoadL1MessagingContractResponse {
    address: string;
    l1_provider: string;
}

export class DevnetUtils implements Devnet {
    constructor(private hre: HardhatRuntimeEnvironment) {}

    private get endpoint() {
        const network = getNetwork(this.hre.config.starknet.network, this.hre, "starknet.network");

        return `${network.url}/postman`;
    }

    private handleError(error: unknown) {
        const parent = error instanceof Error && error;

        throw new HardhatPluginError(
            PLUGIN_NAME,
            "Request failed. Make sure your network has the /postman endpoint",
            parent
        );
    }

    public async flush() {
        try {
            const response = await axios.post<FlushResponse>(`${this.endpoint}/flush`);
            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }

    public async loadL1MessagingContract(networkUrl: string, address?: string, networkId?: string) {
        try {
            const response = await axios.post<LoadL1MessagingContractResponse>(
                `${this.endpoint}/load_l1_messaging_contract`,
                {
                    networkId,
                    address,
                    networkUrl
                }
            );

            return response.data;
        } catch (error) {
            this.handleError(error);
        }
    }
}
