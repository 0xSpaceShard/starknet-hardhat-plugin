import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

export async function starknetEstimateFeeAction(
    args: TaskArguments,
    hre: HardhatRuntimeEnvironment
) {
    const contractFactory = await hre.starknet.getContractFactory(args.contract);
    const contract = contractFactory.attach(args.address);
    const inputs = args.inputs?.split(/\s+/);

    const estimate = await contract.estimate(args.function, inputs);
    console.log(estimate);
}
