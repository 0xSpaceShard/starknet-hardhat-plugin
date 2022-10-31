import { Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import { PLUGIN_NAME } from "./constants";
import { StarknetDockerProxy } from "./starknet-docker-proxy";
import { StarknetVenvProxy } from "./starknet-venv-proxy";
import { BlockNumber, InteractChoice } from "./types";
import { adaptUrl } from "./utils";
import { getPrefixedCommand, normalizeVenvPath } from "./utils/venv";
import { ExternalServer } from "./external-server";
import { StarknetPluginError } from "./starknet-plugin-error";

interface CompileWrapperOptions {
    file: string;
    output: string;
    abi: string;
    cairoPath: string;
    accountContract: boolean;
    disableHintValidation: boolean;
}

interface DeclareWrapperOptions {
    contract: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
    maxFee: string;
    signature?: string[];
    token?: string;
    sender?: string;
}

interface DeployWrapperOptions {
    contract: string;
    gatewayUrl: string;
    inputs?: string[];
    salt?: string;
    token?: string;
}

interface InteractWrapperOptions {
    maxFee: string;
    nonce: string;
    choice: InteractChoice;
    address: string;
    abi: string;
    functionName: string;
    inputs?: string[];
    signature?: string[];
    wallet?: string;
    account?: string;
    accountDir?: string;
    networkID?: string;
    chainID?: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
    blockNumber?: BlockNumber;
}

interface TxHashQueryWrapperOptions {
    hash: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
}

interface DeployAccountWrapperOptions {
    wallet: string;
    accountName: string;
    accountDir: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
    network: string;
    chainID: string;
}

interface NewAccountWrapperOptions {
    wallet: string;
    accountName: string;
    accountDir: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
    network: string;
}

interface BlockQueryWrapperOptions {
    number?: BlockNumber;
    hash?: string;
    gatewayUrl: string;
    feederGatewayUrl: string;
}

interface NonceQueryWrapperOptions {
    address: string;
    feederGatewayUrl: string;
    blockHash?: string;
    blockNumber?: BlockNumber;
}

interface MigrateContractWrapperOptions {
    files: string[];
    inplace: boolean;
}

export abstract class StarknetWrapper {
    constructor(private externalServer: ExternalServer) {}

    public async execute(
        command: "starknet" | "starknet-compile" | "get_class_hash" | "cairo-migrate",
        args: string[]
    ): Promise<ProcessResult> {
        return await this.externalServer.post<ProcessResult>({
            command,
            args
        });
    }

    protected prepareCompileOptions(options: CompileWrapperOptions): string[] {
        const ret = [
            options.file,
            "--abi",
            options.abi,
            "--output",
            options.output,
            "--cairo_path",
            options.cairoPath
        ];

        if (options.accountContract) {
            ret.push("--account_contract");
        }

        if (options.disableHintValidation) {
            ret.push("--disable_hint_validation");
        }

        return ret;
    }

    public abstract compile(options: CompileWrapperOptions): Promise<ProcessResult>;

    public prepareDeclareOptions(options: DeclareWrapperOptions): string[] {
        const prepared = [
            "declare",
            "--contract",
            options.contract,
            "--gateway_url",
            options.gatewayUrl,
            "--feeder_gateway_url",
            options.feederGatewayUrl,
            "--no_wallet"
        ];

        if (options.signature && options.signature.length) {
            prepared.push("--signature", ...options.signature);
        }

        if (options.token) {
            prepared.push("--token", options.token);
        }

        if (options.sender) {
            prepared.push("--sender", options.sender);
        }

        if (options.maxFee == null) {
            throw new StarknetPluginError("No maxFee provided for declare tx");
        }
        prepared.push("--max_fee", options.maxFee);

        return prepared;
    }

    public abstract declare(options: DeclareWrapperOptions): Promise<ProcessResult>;

    protected prepareDeployOptions(options: DeployWrapperOptions): string[] {
        const prepared = [
            "deploy",
            "--contract",
            options.contract,
            "--gateway_url",
            options.gatewayUrl,
            "--no_wallet"
        ];

        if (options.inputs && options.inputs.length) {
            prepared.push("--inputs", ...options.inputs);
        }

        if (options.salt) {
            prepared.push("--salt", options.salt);
        }

        if (options.token) {
            prepared.push("--token", options.token);
        }

        return prepared;
    }

    public abstract deploy(options: DeployWrapperOptions): Promise<ProcessResult>;

    protected prepareInteractOptions(options: InteractWrapperOptions): string[] {
        const prepared = [
            ...options.choice.cliCommand,
            "--abi",
            options.abi,
            "--feeder_gateway_url",
            options.feederGatewayUrl,
            "--gateway_url",
            options.gatewayUrl,
            "--function",
            options.functionName,
            "--address",
            options.address
        ];

        if (options.inputs && options.inputs.length) {
            prepared.push("--inputs", ...options.inputs);
        }

        if (options.signature && options.signature.length) {
            prepared.push("--signature", ...options.signature);
        }

        if (options.blockNumber != null) {
            prepared.push("--block_number", options.blockNumber.toString());
        }

        if (options.wallet) {
            prepared.push("--wallet", options.wallet);
            prepared.push("--network_id", options.networkID);
            prepared.push("--chain_id", options.chainID);

            if (options.account) {
                prepared.push("--account", options.account);
            }
            if (options.accountDir) {
                prepared.push("--account_dir", options.accountDir);
            }
        } else {
            prepared.push("--no_wallet");
        }

        if (options.choice.allowsMaxFee && options.maxFee) {
            prepared.push("--max_fee", options.maxFee);
        }

        if (options.nonce) {
            prepared.push("--nonce", options.nonce);
        }

        return prepared;
    }

    public abstract interact(options: InteractWrapperOptions): Promise<ProcessResult>;

    protected prepareTxQueryOptions(command: string, options: TxHashQueryWrapperOptions): string[] {
        return [
            command,
            "--hash",
            options.hash,
            "--gateway_url",
            options.gatewayUrl,
            "--feeder_gateway_url",
            options.feederGatewayUrl
        ];
    }

    public abstract getTxStatus(options: TxHashQueryWrapperOptions): Promise<ProcessResult>;

    protected prepareDeployAccountOptions(options: DeployAccountWrapperOptions): string[] {
        const prepared = [
            "deploy_account",
            "--network_id",
            options.network,
            "--account",
            options.accountName || "__default__",
            "--gateway_url",
            options.gatewayUrl,
            "--feeder_gateway_url",
            options.feederGatewayUrl
        ];

        if (options.wallet) {
            prepared.push("--wallet", options.wallet);
        }

        if (options.accountDir) {
            prepared.push("--account_dir", options.accountDir);
        }

        prepared.push("--chain_id", options.chainID);

        return prepared;
    }

    public abstract deployAccount(options: DeployAccountWrapperOptions): Promise<ProcessResult>;

    protected prepareNewAccountOptions(options: NewAccountWrapperOptions): string[] {
        const prepared = [
            "new_account",
            "--network_id",
            options.network,
            "--account",
            options.accountName || "__default__",
            "--gateway_url",
            options.gatewayUrl,
            "--feeder_gateway_url",
            options.feederGatewayUrl
        ];

        if (options.wallet) {
            prepared.push("--wallet", options.wallet);
        }

        if (options.accountDir) {
            prepared.push("--account_dir", options.accountDir);
        }

        return prepared;
    }

    public abstract newAccount(options: NewAccountWrapperOptions): Promise<ProcessResult>;

    public abstract getTransactionReceipt(
        options: TxHashQueryWrapperOptions
    ): Promise<ProcessResult>;

    public abstract getTransaction(options: TxHashQueryWrapperOptions): Promise<ProcessResult>;

    protected prepareBlockQueryOptions(options: BlockQueryWrapperOptions): string[] {
        const commandArr = [
            "get_block",
            "--gateway_url",
            options.gatewayUrl,
            "--feeder_gateway_url",
            options.feederGatewayUrl
        ];

        if (options?.hash) {
            commandArr.push("--hash");
            commandArr.push(options.hash);
        }

        if (options?.number) {
            commandArr.push("--number");
            commandArr.push(options.number.toString());
        }

        return commandArr;
    }

    public abstract getBlock(options: BlockQueryWrapperOptions): Promise<ProcessResult>;

    protected prepareNonceQueryOptions(options: NonceQueryWrapperOptions): string[] {
        const commandArr = [
            "get_nonce",
            "--feeder_gateway_url",
            options.feederGatewayUrl,
            "--contract_address",
            options.address
        ];

        if (options.blockHash) {
            commandArr.push("--block_hash", options.blockHash);
        }

        if (options.blockNumber != null) {
            commandArr.push("--block_number", options.blockNumber.toString());
        }

        return commandArr;
    }

    public abstract getNonce(options: NonceQueryWrapperOptions): Promise<ProcessResult>;

    public async getClassHash(artifactPath: string): Promise<string> {
        const executed = await this.execute("get_class_hash", [artifactPath]);
        if (executed.statusCode) {
            throw new StarknetPluginError(executed.stderr.toString());
        }
        return executed.stdout.toString().trim();
    }

    public async migrateContract(options: MigrateContractWrapperOptions): Promise<ProcessResult> {
        const commandArr = [...options.files];

        if (options.inplace) {
            commandArr.push("-i");
        }
        const executed = await this.execute("cairo-migrate", commandArr);
        if (executed.statusCode) {
            throw new StarknetPluginError(executed.stderr.toString());
        }
        return executed;
    }
}

function getFullImageName(image: Image): string {
    return `${image.repository}:${image.tag}`;
}

type String2String = { [path: string]: string };

export class DockerWrapper extends StarknetWrapper {
    constructor(image: Image, rootPath: string, accountPaths: string[], cairoPaths: string[]) {
        super(new StarknetDockerProxy(image, rootPath, accountPaths, cairoPaths));
        console.log(
            `${PLUGIN_NAME} plugin using dockerized environment (${getFullImageName(image)})`
        );
    }

    public async compile(options: CompileWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareCompileOptions(options);
        const executed = this.execute("starknet-compile", preparedOptions);
        return executed;
    }

    public async declare(options: DeclareWrapperOptions): Promise<ProcessResult> {
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        const preparedOptions = this.prepareDeclareOptions(options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async newAccount(options: NewAccountWrapperOptions): Promise<ProcessResult> {
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        const preparedOptions = this.prepareNewAccountOptions(options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async deploy(options: DeployWrapperOptions): Promise<ProcessResult> {
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        const preparedOptions = this.prepareDeployOptions(options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async interact(options: InteractWrapperOptions): Promise<ProcessResult> {
        const binds: String2String = {
            [options.abi]: options.abi
        };

        if (options.accountDir) {
            binds[options.accountDir] = options.accountDir;
        }

        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const preparedOptions = this.prepareInteractOptions(options);
        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getTxStatus(options: TxHashQueryWrapperOptions): Promise<ProcessResult> {
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const preparedOptions = this.prepareTxQueryOptions("tx_status", options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async deployAccount(options: DeployAccountWrapperOptions): Promise<ProcessResult> {
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const preparedOptions = this.prepareDeployAccountOptions(options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getTransactionReceipt(options: TxHashQueryWrapperOptions): Promise<ProcessResult> {
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        const preparedOptions = this.prepareTxQueryOptions("get_transaction_receipt", options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getTransaction(options: TxHashQueryWrapperOptions): Promise<ProcessResult> {
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        const preparedOptions = this.prepareTxQueryOptions("get_transaction", options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getBlock(options: BlockQueryWrapperOptions): Promise<ProcessResult> {
        options.gatewayUrl = adaptUrl(options.gatewayUrl);
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const preparedOptions = this.prepareBlockQueryOptions(options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getNonce(options: NonceQueryWrapperOptions): Promise<ProcessResult> {
        options.feederGatewayUrl = adaptUrl(options.feederGatewayUrl);
        const preparedOptions = this.prepareNonceQueryOptions(options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }
}

export class VenvWrapper extends StarknetWrapper {
    constructor(venvPath: string) {
        let pythonPath: string;
        if (venvPath === "active") {
            console.log(`${PLUGIN_NAME} plugin using the active environment.`);
            pythonPath = "python3";
        } else {
            venvPath = normalizeVenvPath(venvPath);
            console.log(`${PLUGIN_NAME} plugin using environment at ${venvPath}`);
            pythonPath = getPrefixedCommand(venvPath, "python3");
        }

        super(new StarknetVenvProxy(pythonPath));
    }

    public async compile(options: CompileWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareCompileOptions(options);
        const executed = await this.execute("starknet-compile", preparedOptions);
        return executed;
    }

    public async declare(options: DeclareWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareDeclareOptions(options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async newAccount(options: NewAccountWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareNewAccountOptions(options);

        const executed = this.execute("starknet", preparedOptions);
        return executed;
    }

    public async deploy(options: DeployWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareDeployOptions(options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async interact(options: InteractWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareInteractOptions(options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getTxStatus(options: TxHashQueryWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareTxQueryOptions("tx_status", options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async deployAccount(options: DeployAccountWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareDeployAccountOptions(options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getTransactionReceipt(options: TxHashQueryWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareTxQueryOptions("get_transaction_receipt", options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getTransaction(options: TxHashQueryWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareTxQueryOptions("get_transaction", options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getBlock(options: BlockQueryWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareBlockQueryOptions(options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }

    public async getNonce(options: NonceQueryWrapperOptions): Promise<ProcessResult> {
        const preparedOptions = this.prepareNonceQueryOptions(options);
        const executed = await this.execute("starknet", preparedOptions);
        return executed;
    }
}
