import { HardhatRuntimeEnvironment } from "hardhat/types";
import { SierraEntryPointsByType } from "starknet";

export type StarknetContractFactoryConfig = {
    abiPath?: string;
    casmPath?: string;
    metadataPath: string;
    hre: HardhatRuntimeEnvironment;
};

export type StarknetContractConfig = {
    hre: HardhatRuntimeEnvironment;
    isCairo1: boolean;
} & (
    | {
          abiPath: string;
          abiRaw?: undefined;
      }
    | {
          abiPath?: undefined;
          abiRaw: string;
      }
);

export type ContractClassConfig = StarknetContractConfig & {
    sierraProgram: string;
    contractClassVersion: string;
    entryPointsByType: SierraEntryPointsByType;
};
