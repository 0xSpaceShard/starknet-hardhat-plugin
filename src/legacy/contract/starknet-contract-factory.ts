import { HardhatRuntimeEnvironment, StringMap } from "hardhat/types";
import {
    DeclareContractTransaction,
    InvocationsDetailsWithNonce,
    LegacyContractClass,
    SierraContractClass,
    provider as providerUtil,
    selector
} from "starknet";

import { HEXADECIMAL_REGEX } from "../../constants";
import { StarknetPluginError } from "../../starknet-plugin-error";
import { Numeric, starknetTypes } from "../../types";
import { readContractSync, findConstructor } from "../../utils";
import { StarknetContractFactoryConfig, DeclareOptions } from "../types";
import { readAbi, getFallbackAbi, mapAbi, iterativelyCheckStatus, adaptInputUtil } from "../utils";
import { StarknetContract } from "./starknet-contract";

/**
 * Add `signature` elements to to `starknetArgs`, if there are any.
 * @param signature array of transaction signature elements
 */
function handleSignature(signature: Array<Numeric>): string[] {
    if (signature) {
        return signature.map((s) => s.toString());
    }
    return [];
}

export class StarknetContractFactory {
    private classHash: string;
    private constructorAbi: starknetTypes.CairoFunction;
    private contract: LegacyContractClass | SierraContractClass;
    private hre: HardhatRuntimeEnvironment;

    public abi: starknetTypes.Abi;
    public abiPath?: string;
    public abiRaw: string;
    public metadataPath: string;
    public casmPath: string;

    constructor(config: StarknetContractFactoryConfig) {
        this.hre = config.hre;
        this.metadataPath = config.metadataPath;
        this.contract = providerUtil.parseContract(readContractSync(this.metadataPath));

        this.abiPath = config.abiPath;
        this.abiRaw = this.abiPath
            ? readAbi(this.abiPath)
            : getFallbackAbi(this.retrieveContract());
        this.abi = mapAbi(this.abiRaw);
        this.metadataPath = config.metadataPath;
        this.casmPath = config.casmPath;

        const constructorPredicate = this.resolveConstructorPredicate();
        this.constructorAbi = findConstructor(this.abi, constructorPredicate);
    }

    private resolveConstructorPredicate(): (abiEntry: starknetTypes.AbiEntry) => boolean {
        if (!this.isCairo1()) {
            return (abiEntry: starknetTypes.AbiEntry): boolean => {
                return abiEntry.type === "constructor";
            };
        }

        const casmJson = readContractSync(this.casmPath, "utf-8");
        if (casmJson?.compiler_version.split(".")[0] === "0") {
            const msg = ".CASM json should have been generated with a compiler version >= 1";
            throw new StarknetPluginError(msg);
        }

        const constructors = casmJson?.entry_points_by_type?.CONSTRUCTOR;
        if (!constructors || constructors.length === 0) {
            return () => false;
        }

        // Can be removed after new cairo release.
        if (constructors.length > 1) {
            const msg = "There can be at most 1 constructor.";
            throw new StarknetPluginError(msg);
        }

        // Can be simplified once starkware fixes multiple constructor issue.
        // Precomputed selector can be used if only 'constructor' name allowed
        const constructorSelector = constructors[0].selector;
        return (abiEntry: starknetTypes.AbiEntry): boolean => {
            return selector.getSelectorFromName(abiEntry.name) === constructorSelector;
        };
    }

    private retrieveContract() {
        this.contract ??= providerUtil.parseContract(readContractSync(this.metadataPath));
        return this.contract;
    }

    /**
     * Declare a contract class.
     * @param options optional arguments to class declaration
     * @returns transaction hash as a hex string
     */
    async declare(options: DeclareOptions = {}): Promise<string> {
        const transaction: DeclareContractTransaction = {
            contract: this.retrieveContract(),
            senderAddress: options.sender,
            signature: handleSignature(options.signature)
        };
        const details: InvocationsDetailsWithNonce = {
            maxFee: options.maxFee,
            nonce: options.nonce
        };
        const contractResponse = await this.hre.starknetProvider
            .declareContract(transaction, details)
            .catch((error) => {
                const msg = `Could not declare class: ${error}`;
                throw new StarknetPluginError(msg);
            });

        const txHash = contractResponse.transaction_hash;
        return new Promise((resolve, reject) => {
            iterativelyCheckStatus(
                txHash,
                this.hre,
                () => resolve(txHash),
                (error) => {
                    reject(new StarknetPluginError(`Declare transaction ${txHash}: ${error}`));
                }
            );
        });
    }

    handleConstructorArguments(constructorArguments: StringMap): string[] {
        if (!this.constructorAbi) {
            const argsProvided = Object.keys(constructorArguments || {}).length;
            if (argsProvided) {
                const msg = `No constructor arguments required but ${argsProvided} provided`;
                throw new StarknetPluginError(msg);
            }
            return [];
        }
        return adaptInputUtil(
            this.constructorAbi.name,
            constructorArguments,
            this.constructorAbi.inputs,
            this.abi,
            this.isCairo1()
        );
    }

    /**
     * Returns a contract instance with set address.
     * No address validity checks are performed.
     * @param address the address of a previously deployed contract
     * @returns the contract instance at the provided address
     */
    getContractAt(address: string) {
        if (!address) {
            throw new StarknetPluginError("No address provided");
        }
        if (typeof address !== "string" || !HEXADECIMAL_REGEX.test(address)) {
            throw new StarknetPluginError(
                `Address must be 0x-prefixed hex string. Got: "${address}".`
            );
        }
        const contract = new StarknetContract({
            abiPath: this.abiPath,
            abiRaw: this.abiRaw as undefined,
            hre: this.hre,
            isCairo1: this.isCairo1()
        });
        contract.address = address;
        return contract;
    }

    getAbiPath() {
        return this.abiPath;
    }

    isCairo1() {
        return !!this.casmPath;
    }

    async getClassHash() {
        const method = this.isCairo1() ? "getSierraContractClassHash" : "getClassHash";
        this.classHash =
            this.classHash ?? (await this.hre.starknetWrapper[method](this.metadataPath));
        return this.classHash;
    }
}
