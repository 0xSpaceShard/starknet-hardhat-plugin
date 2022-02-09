
import axios from "axios";
import { HardhatPluginError } from "hardhat/plugins";
import { Devnet, HardhatRuntimeEnvironment } from "hardhat/types";

import { PLUGIN_NAME } from "./constants";
import { getNetwork } from "./utils";

interface L2Message {
  from_address: BigInt;
  to_address: BigInt;
  payload: Array<any>;
}

export interface FlushResponse {
  l1_provider: string;
  n_consumed_l2_to_l1_messages: number;
  consumed_l2_messages: Array<L2Message>;
}

export interface LoadL1MessagingContractResponse {
  address: string;
  l1_provider: string;
}

export class DevnetUtils implements Devnet {
  constructor(private hre: HardhatRuntimeEnvironment) {}

  private get endpoint() {
    const network = getNetwork(this.hre.config.starknet.network, this.hre, 'starknet.network');

    return `${network.url}/postman`
  }

  private handleError(error: unknown) {
    const parent = error instanceof Error && error;

    throw new HardhatPluginError(PLUGIN_NAME, 'Request failed. Make sure your network has the /postman endpoint', parent);
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
      const response =
        await axios.post<LoadL1MessagingContractResponse>(`${this.endpoint}/load_l1_messaging_contract`, {
          networkId, address, networkUrl
        });

      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }
}
