import axios, { AxiosResponse, Method } from "axios";
import { StarknetPluginError } from "./starknet-plugin-error";
import { Devnet, HardhatRuntimeEnvironment } from "hardhat/types";

import { Block, L2ToL1Message } from "./starknet-types";
import { REQUEST_TIMEOUT } from "./constants";

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

export interface SetTimeResponse {
    next_block_timestamp: number;
}

export interface IncreaseTimeResponse {
    timestamp_increased_by: number;
}

export interface PredeployedAccount {
    initial_balance: number;
    private_key: string;
    public_key: string;
    address: string;
}

export class DevnetUtils implements Devnet {
    constructor(private hre: HardhatRuntimeEnvironment) {}

    private get endpoint() {
        return `${this.hre.starknet.networkConfig.url}`;
    }

    private async requestHandler(
        url: string,
        method: Method,
        errorMessage?: string,
        data?: unknown,
        headers?: any
    ): Promise<AxiosResponse> {
        try {
            // Make the request
            const axiosInstance = axios.create({
                baseURL: this.endpoint,
                timeout: REQUEST_TIMEOUT,
                timeoutErrorMessage: "Request timed out"
            });

            return axiosInstance.request({
                url,
                method,
                data,
                headers
            });
        } catch (error) {
            const parent = error instanceof Error && error;
            throw new StarknetPluginError(errorMessage, parent);
        }
    }

    public async restart() {
        await this.requestHandler("/restart", "POST", "Failed to restart the devnet!");
    }

    public async flush() {
        const response = await this.requestHandler(
            "/postman/flush",
            "POST",
            "Request failed. Make sure your network has the /flush endpoint"
        );
        return response.data as FlushResponse;
    }

    public async loadL1MessagingContract(networkUrl: string, address?: string, networkId?: string) {
        const body = {
            networkId,
            address,
            networkUrl
        };

        const response = await this.requestHandler(
            "/postman/load_l1_messaging_contract",
            "POST",
            "Request failed. Make sure your network has the /postman endpoint",
            body
        );
        return response.data as LoadL1MessagingContractResponse;
    }

    public async increaseTime(seconds: number) {
        const response = await this.requestHandler(
            "/increase_time",
            "POST",
            "Request failed. Make sure your network has the /increase_time endpoint",
            {
                time: seconds
            }
        );
        return response.data as IncreaseTimeResponse;
    }

    public async setTime(seconds: number) {
        const response = await this.requestHandler(
            "/set_time",
            "POST",
            "Request failed. Make sure your network has the /set_time endpoint",
            {
                time: seconds
            }
        );
        return response.data as SetTimeResponse;
    }

    public async getPredeployedAccounts() {
        const response = await this.requestHandler(
            "/predeployed_accounts",
            "GET",
            "Request failed. Make sure your network has the /predeployed_accounts endpoint"
        );
        return response.data as Array<PredeployedAccount>;
    }

    public async dump(path: string) {
        const response = await this.requestHandler(
            "/dump",
            "POST",
            "Request failed. Make sure your network has the /dump endpoint",
            {
                path
            }
        );
        return response.data;
    }

    public async load(path: string) {
        const response = await this.requestHandler(
            "/load",
            "POST",
            "Request failed. Make sure your network has the /load endpoint",
            {
                path
            }
        );
        return response.data;
    }

    public async createBlock() {
        const response = await this.requestHandler(
            "/create_block",
            "POST",
            "Request failed. Make sure your network has the /create_block endpoint"
        );
        return response.data as Block;
    }
}
