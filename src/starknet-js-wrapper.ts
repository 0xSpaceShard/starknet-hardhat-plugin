import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ProviderInterface, RpcProvider } from "starknet";

export class StarknetJsWrapper {
    public provider: ProviderInterface;

    private hre: HardhatRuntimeEnvironment;

    constructor(hre: HardhatRuntimeEnvironment) {
        this.hre = hre;
        this.setProvider();
    }

    public setProvider() {
        this.provider = new RpcProvider({
            nodeUrl: this.hre.config.starknet.networkConfig.url
        });
        this.hre.starknetProvider = this.provider;
    }
}
