import * as path from "path";
import * as fs from "fs";
import { task, extendEnvironment } from "hardhat/config";
import { HardhatPluginError } from "hardhat/plugins";
import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import "./type-extensions";
import { DockerWrapper } from "./types";

const PLUGIN_NAME = "Starknet";

async function traverseFiles(
    traversable: string,
    predicate: (path: string) => boolean,
    action: (path: string) => Promise<ProcessResult>
): Promise<void> {
    const stats = fs.lstatSync(traversable);
    if (stats.isDirectory()) {
        for (const childName of fs.readdirSync(traversable)) {
            const childPath = path.join(traversable, childName);
            await traverseFiles(childPath, predicate, action);
        }
    } else if (stats.isFile()) {
        if (predicate(traversable)) {
            console.log("File:", traversable);
            const executed = await action(traversable);
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
    } else {
        const msg = `Can only interpret files and directories. ${traversable} is neither.`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }
}

function hasCairoExtension(filePath: string) {
    return path.extname(filePath) === ".cairo";
}

function hasStarknetDeclaration(filePath: string) {
    const content = fs.readFileSync(filePath).toString();
    for (const line of content.split("\n")) {
        if (line.trimRight() === "%lang starknet") {
            return true;
        }
    }
    return false;
}

function hasCairoJsonExtension(filePath: string) {
    return filePath.endsWith(".cairo.json");
}

function hasPythonExtension(filePath: string) {
    return path.extname(filePath) === ".py";
}

function isSimpleCairo(filePath: string) {
    return hasCairoExtension(filePath) && !hasStarknetDeclaration(filePath);
}

function isStarknetContract(filePath: string) {
    return hasCairoExtension(filePath) && hasStarknetDeclaration(filePath);
}

function isStarknetCompilationArtifact(filePath: string) {
    if (!hasCairoJsonExtension(filePath)) {
        return false;
    }

    const content = fs.readFileSync(filePath).toString();
    let parsed = null;
    try {
        parsed = JSON.parse(content);
    } catch(err) {
        return false;
    }

    return !!parsed.entry_points_by_type;
}

function getCompileFunction(docker: HardhatDocker, image: Image, compilerCommand: string, contractsPath: string, artifactsPath: string) {
    const root = path.dirname(contractsPath);
    const rootRegex = new RegExp("^" + root);
    return async (file: string) => {
        const suffix = file.replace(rootRegex, "");
        const outputPath = path.join(artifactsPath, suffix) + ".json";
        const compileArgs = [file, "--output", outputPath]; // TODO abi

        return docker.runContainer(
            image,
            [compilerCommand].concat(compileArgs),
            {
                binds: {
                    [contractsPath]: contractsPath,
                    [artifactsPath]: artifactsPath
                }
            }
        );
    }
}

extendEnvironment(hre => {
    hre.dockerWrapper = new DockerWrapper({ repository: "starknet", tag: "latest" });
});

task("cairo-compile", "Compiles programs written in Cairo")
    .setAction(async (_args, hre) => {
        const sourcesPath = hre.config.paths.sources;
        const artifactsPath = hre.config.paths.artifacts;
        const docker = await hre.dockerWrapper.getDocker();
        const compileFunction = getCompileFunction(docker, hre.dockerWrapper.image, "cairo-compile", sourcesPath, artifactsPath);
        await traverseFiles(sourcesPath, isSimpleCairo, compileFunction);
    });

task("starknet-compile", "Compiles StarkNet contracts")
    .setAction(async (_args, hre) => {
        const sourcesPath = hre.config.paths.sources;
        const artifactsPath = hre.config.paths.artifacts;
        const docker = await hre.dockerWrapper.getDocker();
        const compileFunction = getCompileFunction(docker, hre.dockerWrapper.image, "starknet-compile", sourcesPath, artifactsPath);
        await traverseFiles(sourcesPath, isStarknetContract, compileFunction);
    });

task("starknet-deploy", "Deploys Starknet contracts")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addOptionalParam("gatewayUrl", "The URL of the gateway to be used (e.g. https://alpha2.starknet.io:443)")
    .setAction(async (args, hre) => {
        const artifactsPath = hre.config.paths.artifacts;
        const docker = await hre.dockerWrapper.getDocker();

        const providedStarknetNetwork = args.starknetNetwork || process.env.STARKNET_NETWORK;
        const optionalStarknetArgs: string[] = [];

        if (providedStarknetNetwork) {
            optionalStarknetArgs.push(`--network=${providedStarknetNetwork}`);
        }

        if (args.gatewayUrl) {
            optionalStarknetArgs.push(`--gateway_url=${args.gatewayUrl}`);
        }

        await traverseFiles(artifactsPath, isStarknetCompilationArtifact, file => {
            const starknetArgs = ["deploy", "--contract", file].concat(optionalStarknetArgs);

            return docker.runContainer(
                hre.dockerWrapper.image,
                ["starknet"].concat(starknetArgs),
                {
                    binds: {
                        [artifactsPath]: artifactsPath
                    }
                }
            );
        });
    });

task("starknet-test", "Tests Starknet contracts")
    .setAction(async (_args, hre) => {
        const contractsPath = hre.config.paths.sources;
        const testsPath = hre.config.paths.tests;
        const docker = await hre.dockerWrapper.getDocker();
        await traverseFiles(testsPath, hasPythonExtension, file => {
            const starknetArgs = [file];
            return docker.runContainer(
                hre.dockerWrapper.image,
                ["pytest"].concat(starknetArgs),
                {
                    binds: {
                        [contractsPath]: contractsPath,
                        [testsPath]: testsPath
                    }
                }
            );
        });
    });
