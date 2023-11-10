import {
    constants,
    ec,
    hash,
    selector,
    BigNumberish,
    Call,
    RawCalldata,
    SierraContractClass,
    SuccessfulTransactionReceiptResponse
} from "starknet";

import {
    UDC_DEPLOY_FUNCTION_NAME,
    TransactionHashPrefix,
    QUERY_VERSION,
    StarknetChainId,
    TRANSACTION_VERSION
} from "../../constants";
import { getTransactionReceiptUtil, getNonceUtil } from "../extend-utils";
import { StarknetPluginError } from "../../starknet-plugin-error";
import { InvokeOptions, Numeric, StringMap, starknetTypes } from "../../types";
import {
    estimatedFeeToMaxFee,
    UDC,
    generateRandomSalt,
    numericToHexString,
    readCairo1Contract,
    bnToDecimalStringArray,
    readContract,
    copyWithBigint
} from "../../utils";
import { StarknetContract, StarknetContractFactory } from "../contract";
import {
    InvokeResponse,
    DeployOptions,
    EstimateFeeOptions,
    InteractOptions,
    ContractInteractionFunction,
    DeployAccountOptions,
    DeclareOptions
} from "../types";
import { InteractChoice } from "../utils";
import { CallParameters, mapToLegacyFee, sendDeclareV2Tx } from "./account-utils";

type ExecuteCallParameters = {
    to: bigint;
    selector: BigNumberish;
    data_offset: number;
    data_len: number;
};

/**
 * Representation of an Account.
 * Multiple implementations can exist, each will be defined by an extension of this Abstract class
 */
export abstract class Account {
    public publicKey: string;

    protected constructor(
        public starknetContract: StarknetContract,
        public privateKey: string,
        public salt: string,
        protected deployed: boolean
    ) {
        this.publicKey = ec.starkCurve.getStarkKey(privateKey);
    }

    /**
     * Uses the account contract as a proxy to invoke a function on the target contract with a signature
     *
     * @param toContract target contract to be called
     * @param functionName function in the contract to be called
     * @param calldata calldata to use as input for the contract call
     */
    async invoke(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: InvokeOptions
    ): Promise<InvokeResponse> {
        if (options?.maxFee && options?.overhead) {
            const msg = "maxFee and overhead cannot be specified together";
            throw new StarknetPluginError(msg);
        }

        if (options?.maxFee === undefined || options?.maxFee === null) {
            const maxFee = await this.estimateFee(toContract, functionName, calldata, options);
            options = {
                ...options,
                maxFee: estimatedFeeToMaxFee(maxFee.amount, options?.overhead)
            };
        }
        return (
            await this.interact(InteractChoice.INVOKE, toContract, functionName, calldata, options)
        ).toString();
    }

    get address() {
        return this.starknetContract.address;
    }

    /**
     * Deploy another contract using this account
     * @param contractFactory the factory of the contract to be deployed
     * @param constructorArguments
     * @param options extra options
     * @returns the deployed StarknetContract
     */
    async deploy(
        contractFactory: StarknetContractFactory,
        constructorArguments?: StringMap,
        options: DeployOptions = {}
    ): Promise<StarknetContract> {
        const classHash = await contractFactory.getClassHash();
        const udc = await UDC.getInstance();
        const adaptedArgs = contractFactory.handleConstructorArguments(constructorArguments);
        const deployTxHash = await this.invoke(
            udc,
            UDC_DEPLOY_FUNCTION_NAME,
            {
                classHash,
                salt: options?.salt ?? generateRandomSalt(),
                unique: BigInt(options?.unique ?? true),
                calldata: adaptedArgs
            },
            {
                maxFee: options?.maxFee,
                nonce: options?.nonce
            }
        );

        const hre = await import("hardhat");
        const deploymentReceipt = (await getTransactionReceiptUtil(
            deployTxHash,
            hre
        )) as SuccessfulTransactionReceiptResponse;
        const decodedEvents = udc.decodeEvents(deploymentReceipt.events);
        // the only event should be ContractDeployed
        const deployedContractAddress = numericToHexString(decodedEvents[0].data.address);

        const deployedContract = contractFactory.getContractAt(deployedContractAddress);
        deployedContract.deployTxHash = deployTxHash;

        return deployedContract;
    }

    protected assertNotDeployed() {
        if (this.deployed) {
            const msg = "The account is not expected to be deployed.";
            throw new StarknetPluginError(msg);
        }
    }

    private assertDeployed() {
        if (!this.deployed) {
            const msg = "Prior to usage, the account must be funded and deployed.";
            throw new StarknetPluginError(msg);
        }
    }

    async estimateFee(
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: EstimateFeeOptions
    ): Promise<starknetTypes.FeeEstimation> {
        return await this.interact(
            InteractChoice.ESTIMATE_FEE,
            toContract,
            functionName,
            calldata,
            options
        );
    }

    private async estimateDeclareV2Fee(
        contractFactory: StarknetContractFactory,
        options: EstimateFeeOptions = {}
    ): Promise<starknetTypes.FeeEstimation> {
        const maxFee = (options.maxFee || 0).toString();
        const version = hash.feeTransactionVersion_2;
        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;

        const hre = await import("hardhat");
        const chainId = hre.starknet.networkConfig.starknetChainId;

        const compiledClassHash = await hre.starknetWrapper.getCompiledClassHash(
            contractFactory.casmPath
        );

        const classHash = await hre.starknetWrapper.getSierraContractClassHash(
            contractFactory.metadataPath
        );

        const messageHash = hash.calculateDeclareTransactionHash(
            classHash,
            this.address,
            version,
            maxFee,
            chainId as unknown as constants.StarknetChainId,
            nonce,
            compiledClassHash
        );
        const signatures = this.getSignatures(messageHash);
        const contract = readCairo1Contract(
            contractFactory.metadataPath
        ).getCompiledClass() as SierraContractClass;

        const estimate = await hre.starknetProvider.getDeclareEstimateFee(
            {
                compiledClassHash,
                contract,
                senderAddress: this.address,
                signature: bnToDecimalStringArray(signatures || [])
            },
            {
                maxFee,
                nonce,
                version: numericToHexString(QUERY_VERSION)
            }
        );
        return mapToLegacyFee(estimate);
    }

    async estimateDeclareFee(
        contractFactory: StarknetContractFactory,
        options: EstimateFeeOptions = {}
    ): Promise<starknetTypes.FeeEstimation> {
        if (contractFactory.isCairo1()) {
            return await this.estimateDeclareV2Fee(contractFactory, options);
        }

        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        const maxFee = (options.maxFee || 0).toString();

        const hre = await import("hardhat");
        const classHash = await hre.starknetWrapper.getClassHash(contractFactory.metadataPath);
        const chainId = hre.starknet.networkConfig.starknetChainId;

        const calldata = [classHash];
        const calldataHash = hash.computeHashOnElements(calldata);

        const messageHash = hash.computeHashOnElements([
            TransactionHashPrefix.DECLARE,
            numericToHexString(QUERY_VERSION),
            this.address,
            0, // entrypoint selector is implied
            calldataHash,
            maxFee,
            chainId,
            numericToHexString(nonce)
        ]);
        const signature = this.getSignatures(messageHash);
        const contract = readContract(contractFactory.metadataPath);

        const estimate = await hre.starknetProvider.getDeclareEstimateFee(
            {
                contract,
                senderAddress: this.address,
                signature: bnToDecimalStringArray(signature || [])
            },
            {
                maxFee,
                nonce,
                version: numericToHexString(QUERY_VERSION)
            }
        );
        return mapToLegacyFee(estimate);
    }

    async estimateDeployFee(
        contractFactory: StarknetContractFactory,
        constructorArguments?: StringMap,
        options: EstimateFeeOptions = {}
    ): Promise<starknetTypes.FeeEstimation> {
        const classHash = await contractFactory.getClassHash();
        const udc = await UDC.getInstance();
        const adaptedArgs = contractFactory.handleConstructorArguments(constructorArguments);
        const calldata: StringMap = {
            classHash,
            salt: options?.salt ?? generateRandomSalt(),
            unique: BigInt(options?.unique ?? true),
            calldata: adaptedArgs
        };
        return await this.estimateFee(udc, UDC_DEPLOY_FUNCTION_NAME, calldata, options);
    }

    private async interact(
        choice: InteractChoice,
        toContract: StarknetContract,
        functionName: string,
        calldata?: StringMap,
        options?: InteractOptions
    ) {
        const call: CallParameters = {
            functionName: functionName,
            toContract: toContract,
            calldata: calldata
        };

        return await this.multiInteract(choice, [call], options);
    }

    /**
     * Performs multiple invokes as a single transaction through this account
     * @param callParameters an array with the parameters for each invoke
     * @returns the transaction hash of the invoke
     */
    async multiInvoke(callParameters: CallParameters[], options?: InvokeOptions): Promise<string> {
        // Invoke only returns one transaction hash, as the multiple invokes are done by the account contract, but only one is sent to it.
        return await this.multiInteract(InteractChoice.INVOKE, callParameters, options);
    }

    /**
     * Estimate the fee of the multicall.
     * @param callParameters an array with the parameters for each call
     * @returns the total estimated fee
     */
    async multiEstimateFee(
        callParameters: CallParameters[],
        options?: EstimateFeeOptions
    ): Promise<starknetTypes.FeeEstimation> {
        return await this.multiInteract(InteractChoice.ESTIMATE_FEE, callParameters, options);
    }

    private async multiInteract(
        choice: InteractChoice,
        callParameters: CallParameters[],
        options: InteractOptions = {}
    ) {
        this.assertDeployed();
        options = copyWithBigint(options);
        options.maxFee = BigInt(options?.maxFee || "0");
        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        delete options.nonce; // the options object is incompatible if passed on with nonce

        const hre = await import("hardhat");
        const { messageHash, args } = this.handleMultiInteract(
            this.address,
            callParameters,
            nonce,
            options.maxFee,
            choice.transactionVersion,
            hre.starknet.networkConfig.starknetChainId,
            options.rawInput
        );

        if (options.signature) {
            const msg =
                "Custom signature cannot be specified when using Account (it is calculated automatically)";
            throw new StarknetPluginError(msg);
        }
        const contractInteractOptions = {
            signature: this.getSignatures(messageHash),
            ...options,
            rawInput: false // rawInput shouldn't affect validating args of __execute__
        };

        const contractInteractor = (<ContractInteractionFunction>(
            this.starknetContract[choice.internalCommand]
        )).bind(this.starknetContract);
        const executionFunctionName = this.getExecutionFunctionName();
        return contractInteractor(executionFunctionName, args, contractInteractOptions);
    }

    /**
     * Prepares the calldata and hashes the message for the multicall execution
     *
     * @param accountAddress address of the account contract
     * @param callParameters array with the call parameters
     * @param nonce current nonce
     * @param maxFee the maximum fee amount set for the contract interaction
     * @param version the transaction version
     * @param chainId the ID of the chain
     * @param rawInput if `true`, interprets calldata as already adapted into an array
     * @returns the message hash for the multicall and the arguments to execute it with
     */
    private handleMultiInteract(
        accountAddress: string,
        callParameters: CallParameters[],
        nonce: Numeric,
        maxFee: Numeric,
        version: Numeric,
        chainId: StarknetChainId,
        rawInput: boolean
    ) {
        const callArray: Call[] = callParameters.map((callParameters) => {
            const calldata = rawInput
                ? <string[]>callParameters.calldata
                : callParameters.toContract.adaptInput(
                      callParameters.functionName,
                      callParameters.calldata
                  );
            return {
                contractAddress: callParameters.toContract.address,
                entrypoint: callParameters.functionName,
                calldata
            };
        });

        const executeCallArray: ExecuteCallParameters[] = [];
        const rawCalldata: RawCalldata = [];

        // Parse the Call array to create the objects which will be accepted by the contract
        callArray.forEach((call) => {
            const calldata = call.calldata as BigNumberish[];
            executeCallArray.push({
                to: BigInt(call.contractAddress),
                selector: selector.starknetKeccak(call.entrypoint),
                data_offset: rawCalldata.length,
                data_len: calldata.length
            });
            rawCalldata.push(...calldata);
        });

        const adaptedNonce = nonce.toString();
        const adaptedMaxFee = numericToHexString(maxFee);
        const adaptedVersion = numericToHexString(version);
        const messageHash = this.getMessageHash(
            TransactionHashPrefix.INVOKE,
            accountAddress,
            callArray,
            adaptedNonce,
            adaptedMaxFee,
            adaptedVersion,
            chainId
        );

        const args = {
            call_array: executeCallArray,
            calldata: rawCalldata
        };
        return { messageHash, args };
    }

    protected abstract getMessageHash(
        transactionHashPrefix: TransactionHashPrefix,
        accountAddress: string,
        callArray: Call[],
        nonce: string,
        maxFee: string,
        version: string,
        chainId: StarknetChainId
    ): string;

    protected abstract getSignatures(messageHash: string): bigint[];

    protected abstract estimateDeployAccountFee(): Promise<starknetTypes.FeeEstimation>;

    public abstract deployAccount(options?: DeployAccountOptions): Promise<string>;

    protected getExecutionFunctionName() {
        return "__execute__";
    }

    private async getNonce(): Promise<number> {
        const hre = await import("hardhat");
        return await getNonceUtil(hre, this.address, null);
    }

    /**
     * Declare the contract class corresponding to the `contractFactory`
     * @param contractFactory
     * @param options
     * @returns transaction hash
     */
    public async declare(
        contractFactory: StarknetContractFactory,
        options: DeclareOptions = {}
    ): Promise<string> {
        if (contractFactory.isCairo1()) {
            return await this.declareV2(contractFactory, options);
        }

        let maxFee = options?.maxFee;
        if (maxFee && options?.overhead) {
            const msg = "maxFee and overhead cannot be specified together";
            throw new StarknetPluginError(msg);
        }

        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        if (maxFee === undefined || maxFee === null) {
            const estimatedDeclareFee = await this.estimateDeclareFee(contractFactory, options);
            maxFee = estimatedFeeToMaxFee(estimatedDeclareFee.amount, options?.overhead);
        }

        const hre = await import("hardhat");
        const classHash = await hre.starknetWrapper.getClassHash(contractFactory.metadataPath);
        const chainId = hre.starknet.networkConfig.starknetChainId;

        const calldata = [classHash];
        const calldataHash = hash.computeHashOnElements(calldata);

        const messageHash = hash.computeHashOnElements([
            TransactionHashPrefix.DECLARE,
            TRANSACTION_VERSION.toString(),
            this.address,
            0, // entrypoint selector is implied
            calldataHash,
            maxFee.toString(),
            chainId,
            nonce.toString()
        ]);

        const signature = this.getSignatures(messageHash);
        return contractFactory.declare({
            nonce,
            signature,
            token: options.token,
            sender: this.address,
            maxFee: BigInt(maxFee)
        });
    }

    private async declareV2(
        contractFactory: StarknetContractFactory,
        options: DeclareOptions = {}
    ): Promise<string> {
        let maxFee = options?.maxFee;
        if (maxFee && options?.overhead) {
            const msg = "maxFee and overhead cannot be specified together";
            throw new StarknetPluginError(msg);
        }

        const nonce = options.nonce == null ? await this.getNonce() : options.nonce;
        if (maxFee === undefined || maxFee === null) {
            const estimatedDeclareFee = await this.estimateDeclareV2Fee(contractFactory, options);
            maxFee = estimatedFeeToMaxFee(estimatedDeclareFee.amount, options?.overhead);
        }

        const version = hash.transactionVersion_2;
        const hre = await import("hardhat");
        const chainId = hre.starknet.networkConfig.starknetChainId;

        const compiledClassHash = await hre.starknetWrapper.getCompiledClassHash(
            contractFactory.casmPath
        );
        const classHash = await hre.starknetWrapper.getSierraContractClassHash(
            contractFactory.metadataPath
        );

        const messageHash = hash.calculateDeclareTransactionHash(
            classHash,
            this.address,
            version,
            maxFee,
            chainId as unknown as constants.StarknetChainId,
            nonce,
            compiledClassHash
        );
        const signatures = this.getSignatures(messageHash);

        return sendDeclareV2Tx(
            bnToDecimalStringArray(signatures),
            compiledClassHash,
            maxFee,
            this.address,
            version,
            nonce,
            readCairo1Contract(contractFactory.metadataPath)
        );
    }
}
