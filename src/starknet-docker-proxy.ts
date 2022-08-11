import { Image } from "@nomiclabs/hardhat-docker";
import { DockerServer } from "./devnet/docker-devnet";

export class StarknetDockerProxy extends DockerServer {
    constructor(image: Image) {
        // TODO hardcoded ports
        super(image, "127.0.0.1", "5050", "5050", "", "starknet-docker-proxy");
    }

}
