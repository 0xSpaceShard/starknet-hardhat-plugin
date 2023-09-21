import { StarknetContract } from "./starknet-contract";
import { ContractClassConfig, SierraEntryPointsByType } from "../../types";

export class Cairo1ContractClass extends StarknetContract {
    protected sierraProgram: string;
    protected contractClassVersion: string;
    protected entryPointsByType: SierraEntryPointsByType;

    constructor(config: ContractClassConfig) {
        super(config);

        this.sierraProgram = config.sierraProgram;
        this.contractClassVersion = config.contractClassVersion;
        this.entryPointsByType = config.entryPointsByType;
    }

    /**
     * Returns the compiled class.
     * @returns object of a compiled contract class
     */
    getCompiledClass() {
        return {
            sierra_program: this.sierraProgram,
            contract_class_version: this.contractClassVersion,
            entry_points_by_type: this.entryPointsByType,
            abi: this.abiRaw
        };
    }
}
