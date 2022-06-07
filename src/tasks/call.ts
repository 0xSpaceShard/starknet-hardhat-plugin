import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

export async function starknetCallAction(args: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const contractFactory = await hre.starknet.getContractFactory(args.contract);
    const contract = contractFactory.attach(args.address);
    const inputs = args.inputs?.split(/\s+/);
    const blockIdentifier = args.blockIdentifier || "pending";

    const result = await contract.call(args.function, inputs, { blockIdentifier });

    console.log(result);
}
