import { HardhatRuntimeEnvironment } from "hardhat/types";
import { SequencerProvider } from "starknet";

import {
    CHECK_STATUS_RECOVER_TIMEOUT,
    CHECK_STATUS_TIMEOUT,
    QUERY_VERSION,
    TRANSACTION_VERSION
} from "../../constants";
import { StarknetPluginError } from "../../starknet-plugin-error";
import { Numeric, StatusObject, TxStatus, starknetTypes } from "../../types";
import { adaptLog, sleep, warn } from "../../utils";
import { StarknetContract } from "../contract";

export * from "./abi";
export * from "./adapt";

const ACCEPTABLE_STATUSES: TxStatus[] = ["PENDING", "ACCEPTED_ON_L2", "ACCEPTED_ON_L1"];
export function isTxAccepted(statusObject: StatusObject): boolean {
    return ACCEPTABLE_STATUSES.includes(statusObject.tx_status);
}

const UNACCEPTABLE_STATUSES: TxStatus[] = ["REJECTED", "REVERTED"];
export function isTxRejected(statusObject: StatusObject): boolean {
    return UNACCEPTABLE_STATUSES.includes(statusObject.tx_status);
}

export async function iterativelyCheckStatus(
    txHash: string,
    hre: HardhatRuntimeEnvironment,
    resolve: (status: string) => void,
    reject: (reason: Error) => void,
    retryCount = 10
) {
    // eslint-disable-next-line no-constant-condition
    while (true) {
        let count = retryCount;
        let statusObject: StatusObject;
        let error;
        while (count > 0) {
            // This promise is rejected usually if the network is unavailable
            statusObject = await (hre.starknetProvider as SequencerProvider)
                .getTransactionStatus(txHash)
                .catch((err) => {
                    error = new StarknetPluginError(err);
                    return undefined;
                });

            // Check count at 1 to avoid unnecessary waiting(sleep) in the last iteration
            if (statusObject || count === 1) {
                break;
            }

            await sleep(CHECK_STATUS_RECOVER_TIMEOUT);
            warn("Retrying transaction status check...");
            count--;
        }

        if (!statusObject) {
            warn("Checking transaction status failed.");
            return reject(error);
        } else if (isTxAccepted(statusObject)) {
            return resolve(statusObject.tx_status);
        } else if (isTxRejected(statusObject)) {
            const adaptedError = adaptLog(JSON.stringify(statusObject, null, 4));
            return reject(new Error(adaptedError));
        }

        await sleep(CHECK_STATUS_TIMEOUT);
    }
}

/**
 * Enumerates the ways of interacting with a contract.
 */
export class InteractChoice {
    static readonly INVOKE = new InteractChoice(["invoke"], "invoke", true, TRANSACTION_VERSION);

    static readonly CALL = new InteractChoice(["call"], "call", false, QUERY_VERSION);

    static readonly ESTIMATE_FEE = new InteractChoice(
        ["invoke", "--estimate_fee"],
        "estimateFee",
        false,
        QUERY_VERSION
    );

    private constructor(
        /**
         * The way it's supposed to be used passed to CLI commands.
         */
        public readonly cliCommand: string[],
        /**
         * The way it's supposed to be used internally in code.
         */
        public readonly internalCommand: keyof StarknetContract,

        /**
         * Indicates whether the belonging CLI option allows specifying max_fee.
         */
        public readonly allowsMaxFee: boolean,

        /**
         * The version of the transaction.
         */
        public transactionVersion: Numeric
    ) {}
}

export function parseFeeEstimation(raw: string): starknetTypes.FeeEstimation {
    const matchedAmount = raw.match(/^The estimated fee is: (\d*) WEI \(.* ETH\)\./m);
    const matchedGasUsage = raw.match(/^Gas usage: (\d*)/m);
    const matchedGasPrice = raw.match(/^Gas price: (\d*) WEI/m);
    if (matchedAmount && matchedGasUsage && matchedGasPrice) {
        return {
            amount: BigInt(matchedAmount[1]),
            unit: "wei",
            gas_price: BigInt(matchedGasPrice[1]),
            gas_usage: BigInt(matchedGasUsage[1])
        };
    }
    throw new StarknetPluginError(`Cannot parse fee estimation response:\n${raw}`);
}
