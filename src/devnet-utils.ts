import axios from "axios";
import { HardhatPluginError } from "hardhat/plugins";
import { Devnet, HardhatRuntimeEnvironment } from "hardhat/types";

import { PLUGIN_NAME } from "./constants";
import { L2ToL1Message } from "./starknet-types";

interface L1ToL2Message {
    address: string;
    args: {
        from_address: string;
        nonce: number;
        payload: Array<number>;
        selector: string;
        to_address: string;
    };
    block_hash: string;
    block_number: number;
    event: string;
    log_index: number;
    transaction_hash: string;
    transaction_index: number;
}

export interface FlushResponse {
    l1_provider: string;
    consumed_messages: {
        from_l1: Array<L1ToL2Message>;
        from_l2: Array<L2ToL1Message>;
    };
}

export interface LoadL1MessagingContractResponse {
    address: string;
    l1_provider: string;
}

export class DevnetUtils implements Devnet {
    constructor(private hre: HardhatRuntimeEnvironment) {}

    private get endpoint() {
        return `${this.hre.config.starknet.networkUrl}/postman`;
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
