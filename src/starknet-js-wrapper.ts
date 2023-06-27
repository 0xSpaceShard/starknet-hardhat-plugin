import { ProcessResult } from "@nomiclabs/hardhat-docker";
import { promises as fsp } from "fs";
import { NetworkConfig } from "hardhat/types/config";
import {
    BigNumberish,
    BlockIdentifier,
    json,
    provider as providerUtil,
    SequencerProvider
} from "starknet";

export class StarknetJsWrapper {
    public provider: SequencerProvider;

    constructor(networkConfig: NetworkConfig) {
        this.setProvider(networkConfig);
    }

    public setProvider(networkConfig: NetworkConfig) {
        this.provider = new SequencerProvider({
            baseUrl: networkConfig.url
        });
    }
}

/**
 * StarknetLegacyWrapper is meant to facilitate the discontinuation of the Starknet CLI usage within StarknetWrapper
 */
export class StarknetLegacyWrapper extends StarknetJsWrapper {
    private async readContract(contractPath: string) {
        return json.parse((await fsp.readFile(contractPath)).toString("ascii"));
    }

    private stringifyResponse(r: unknown) {
        return typeof r !== "string"
            ? `${json.stringify(r, undefined, "\n").replace(/\n+/g, "\n")}\n`
            : r;
    }

    private generateProcessResult(
        statusCode: number,
        stdout: string,
        stderr: string
    ): ProcessResult {
        return {
            statusCode,
            stdout,
            stderr
        } as unknown as ProcessResult;
    }

    private async wrapProcessResult(p: Promise<unknown>): Promise<ProcessResult> {
        return p
            .then((a) => this.generateProcessResult(0, this.stringifyResponse(a), ""))
            .catch((e) => this.generateProcessResult(1, "", this.stringifyResponse(e)));
    }

    public async declare(
        contractPath: string,
        senderAddress: string,
        signature: string[],
        nonce: string,
        maxFee: string
    ): Promise<ProcessResult> {
        const contractJson = await this.readContract(contractPath);
        const contract = providerUtil.parseContract(contractJson);

        return this.wrapProcessResult(
            this.provider
                .declareContract(
                    {
                        contract,
                        senderAddress,
                        signature
                    },
                    {
                        nonce,
                        maxFee
                    }
                )
                .then(
                    ({ class_hash, transaction_hash }) =>
                        "DeprecatedDeclare transaction was sent.\n" +
                        `Contract class hash: ${class_hash}\n` +
                        `Transaction hash: ${transaction_hash}\n`
                )
        );
    }

    public async getTxStatus(txHash: BigNumberish): Promise<ProcessResult> {
        return this.wrapProcessResult(this.provider.getTransactionStatus(txHash));
    }

    public async getTransactionTrace(txHash: BigNumberish): Promise<ProcessResult> {
        return this.wrapProcessResult(this.provider.getTransactionTrace(txHash));
    }

    public async getTransactionReceipt(txHash: BigNumberish): Promise<ProcessResult> {
        return this.wrapProcessResult(this.provider.getTransactionReceipt(txHash));
    }

    public async getTransaction(txHash: BigNumberish): Promise<ProcessResult> {
        return this.wrapProcessResult(this.provider.getTransaction(txHash));
    }

    public async getBlock(blockIdentifier?: BlockIdentifier): Promise<ProcessResult> {
        return this.wrapProcessResult(this.provider.getBlock(blockIdentifier));
    }

    public async getNonce(
        address: string,
        blockIdentifier?: BlockIdentifier
    ): Promise<ProcessResult> {
        return this.wrapProcessResult(
            this.provider.getNonceForAddress(address, blockIdentifier).then(BigInt)
        );
    }
}
