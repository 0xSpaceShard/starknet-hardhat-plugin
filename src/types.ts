import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";

export class DockerWrapper {
    private docker: HardhatDocker;
    public image: Image;

    constructor(image: Image) {
        this.image = image;
    }

    public async getDocker() {
        if (!this.docker) {
            this.docker = await HardhatDocker.create();
            if (!(await this.docker.hasPulledImage(this.image))) {
                console.log("Pulling image:", this.image);
                await this.docker.pullImage(this.image);
            }
        }
        return this.docker;
    }
}
