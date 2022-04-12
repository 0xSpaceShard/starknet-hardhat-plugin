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
        return `${this.hre.config.starknet.networkUrl}`;
    }

    private async withErrorHandler<T>(asyncFn: () => Promise<T>, errorMessage: string) {
        try {
            return await asyncFn();
        } catch (error) {
            const parent = error instanceof Error && error;

            throw new HardhatPluginError(PLUGIN_NAME, errorMessage, parent);
        }
    }

    public async restart() {
        return this.withErrorHandler<void>(async () => {
            await axios.post(`${this.endpoint}/restart`);
        }, "Failed to restart the devnet!");
    }

    public async flush() {
        return this.withErrorHandler<FlushResponse>(async () => {
            const response = await axios.post<FlushResponse>(`${this.endpoint}/postman/flush`);
            return response.data;
        }, "Request failed. Make sure your network has the /postman endpoint");
    }

    public async loadL1MessagingContract(networkUrl: string, address?: string, networkId?: string) {
        return this.withErrorHandler<LoadL1MessagingContractResponse>(async () => {
            const response = await axios.post<LoadL1MessagingContractResponse>(
                `${this.endpoint}/postman/load_l1_messaging_contract`,
                {
                    networkId,
                    address,
                    networkUrl
                }
            );

            return response.data;
        }, "Request failed. Make sure your network has the /postman endpoint");
    }
}
