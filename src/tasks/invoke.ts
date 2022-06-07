import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

export async function starknetInvokeAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const contractFactory = await hre.starknet.getContractFactory(args.contract);
    const contract = contractFactory.attach(args.address);
    const inputs = args.inputs?.split(/\s+/);

    const response = await contract.invoke(args.function, inputs);

    console.log(response);

    if (args.wait) {
        await contractFactory.providerOrAccount.waitForTransaction(response.transaction_hash);

        const transactionResponse = await contractFactory.providerOrAccount.getTransaction(
            response.transaction_hash
        );

        console.log(transactionResponse.status);
    }
}
