import * as path from "path";
import * as fs from "fs";
import { task, extendEnvironment, extendConfig } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import "./type-extensions";
import { DockerWrapper, StarknetContract } from "./types";
import { PLUGIN_NAME, ABI_SUFFIX, DEFAULT_STARKNET_ARTIFACTS_PATH, DEFAULT_DOCKER_IMAGE_TAG, DOCKER_REPOSITORY } from "./constants";
import { HardhatConfig, HardhatUserConfig } from "hardhat/types";

async function traverseFiles(
    traversable: string,
    predicate: (path: string) => boolean,
    action: (path: string) => Promise<void>
): Promise<void> {
    const stats = fs.lstatSync(traversable);
    if (stats.isDirectory()) {
        for (const childName of fs.readdirSync(traversable)) {
            const childPath = path.join(traversable, childName);
            await traverseFiles(childPath, predicate, action);
        }
    } else if (stats.isFile()) {
        if (predicate(traversable)) {
            await action(traversable);
        }
    } else {
        const msg = `Can only interpret files and directories. ${traversable} is neither.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

function logExecuted(executed: ProcessResult) {
    if (executed.stdout.length) {
        console.log(executed.stdout.toString());
    }

    if (executed.stderr.length) {
        // synchronize param names reported by actual CLI with param names used by this plugin
        const err = executed.stderr.toString()
            .replace("--network", "--starknet-network")
            .replace("--gateway_url", "--gateway-url")
        console.error(err);
    }

    const finalMsg = executed.statusCode ? "Failed" : "Succeeded";
    console.log(`\t${finalMsg}\n`);
}

function hasCairoExtension(filePath: string) {
    return path.extname(filePath) === ".cairo";
}

function hasPythonExtension(filePath: string) {
    return path.extname(filePath) === ".py";
}

function isStarknetContract(filePath: string) {
    return hasCairoExtension(filePath);
}

function isStarknetCompilationArtifact(filePath: string) {
    const content = fs.readFileSync(filePath).toString();
    let parsed = null;
    try {
        parsed = JSON.parse(content);
    } catch(err) {
        return false;
    }

    return !!parsed.entry_points_by_type;
}

function getFileName(filePath: string) {
    return path.basename(filePath, path.extname(filePath));
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    let newPath: string;
    if (userConfig.paths && userConfig.paths.starknetArtifacts) {
        const userPath = userConfig.paths.starknetArtifacts;
        if (path.isAbsolute(userPath)) {
            newPath = userPath;
        } else {
            newPath = path.normalize(path.join(config.paths.root, userPath));
        }
        config.paths.starknetArtifacts = userConfig.paths.starknetArtifacts;
    } else {
        const defaultPath = path.join(config.paths.root, DEFAULT_STARKNET_ARTIFACTS_PATH);
        newPath = defaultPath;
    }

    config.paths.starknetArtifacts = newPath;
});

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    config.cairo = userConfig.cairo;
    if (!config.cairo) {
        config.cairo = {
            version: DEFAULT_DOCKER_IMAGE_TAG
        };
    }

    if (!config.cairo.version) {
        config.cairo.version = DEFAULT_DOCKER_IMAGE_TAG;
    }
});

extendEnvironment(hre => {
    const repository = DOCKER_REPOSITORY;
    const tag = hre.config.cairo.version;
    hre.dockerWrapper = new DockerWrapper({ repository, tag });
});

task("starknet-compile", "Compiles StarkNet contracts")
    .setAction(async (_args, hre) => {
        const sourcesPath = hre.config.paths.sources;
        const artifactsPath = hre.config.paths.starknetArtifacts;
        const docker = await hre.dockerWrapper.getDocker();

        const root = hre.config.paths.root;
        const rootRegex = new RegExp("^" + root);

        await traverseFiles(sourcesPath, isStarknetContract, async (file: string) => {
            console.log("Compiling", file);
            const suffix = file.replace(rootRegex, "");
            const fileName = getFileName(suffix);
            const dirPath = path.join(artifactsPath, suffix);

            const outputPath = path.join(dirPath, `${fileName}.json`);
            const abiPath = path.join(dirPath, `${fileName}${ABI_SUFFIX}`)
            const compileArgs = [file, "--output", outputPath, "--abi", abiPath];

            fs.mkdirSync(dirPath, { recursive: true });
            const executed = await docker.runContainer(
                hre.dockerWrapper.image,
                ["starknet-compile"].concat(compileArgs),
                {
                    binds: {
                        [sourcesPath]: sourcesPath,
                        [artifactsPath]: artifactsPath
                    }
                }
            );
            logExecuted(executed);
        });
    });

task("starknet-deploy", "Deploys Starknet contracts")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addOptionalParam("gatewayUrl", "The URL of the gateway to be used (e.g. https://alpha2.starknet.io:443)")
    .setAction(async (args, hre) => {
        const artifactsPath = hre.config.paths.starknetArtifacts;
        const docker = await hre.dockerWrapper.getDocker();

        const providedStarknetNetwork = args.starknetNetwork || process.env.STARKNET_NETWORK;
        const optionalStarknetArgs: string[] = [];

        if (providedStarknetNetwork) {
            optionalStarknetArgs.push(`--network=${providedStarknetNetwork}`);
        }

        if (args.gatewayUrl) {
            optionalStarknetArgs.push(`--gateway_url=${args.gatewayUrl}`);
        }

        await traverseFiles(artifactsPath, isStarknetCompilationArtifact, async file => {
            console.log("Deploying", file);
            const starknetArgs = ["deploy", "--contract", file].concat(optionalStarknetArgs);

            const executed = await docker.runContainer(
                hre.dockerWrapper.image,
                ["starknet"].concat(starknetArgs),
                {
                    binds: {
                        [artifactsPath]: artifactsPath
                    }
                }
            );
            logExecuted(executed);
        });
    });

extendEnvironment(hre => {
    hre.getStarknetContract = async contractName => {
        let metadataPath: any;
        await traverseFiles(
            hre.config.paths.starknetArtifacts,
            file => path.basename(file) === `${contractName}.json`,
            async file => {
                metadataPath = file;
            }
        );
        if (!metadataPath) {
            throw new HardhatPluginError(PLUGIN_NAME, `Could not find metadata for ${contractName}`);
        }

        let abiPath: any;
        await traverseFiles(
            hre.config.paths.starknetArtifacts,
            file => path.basename(file) === `${contractName}${ABI_SUFFIX}`,
            async file => {
                abiPath = file;
            }
        )
        if (!abiPath) {
            throw new HardhatPluginError(PLUGIN_NAME, `Could not find ABI for ${contractName}`);
        }

        return new StarknetContract(hre.dockerWrapper, metadataPath, abiPath);
    }
});
