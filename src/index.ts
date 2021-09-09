import * as path from "path";
import * as fs from "fs";
import { task, extendEnvironment } from "hardhat/config";
import { HardhatDocker, Image, ProcessResult } from "@nomiclabs/hardhat-docker";
import "./type-extensions";
import { DockerWrapper } from "./types";

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
                console.error(executed.stderr.toString());
            }

            const finalMsg = executed.statusCode ? "Failed" : "Succeeded";
            console.log(`\t${finalMsg}\n`);
        }
    } else {
        throw new Error(`Can only interpret files and directories. ${traversable} is neither.`);
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
    .addFlag("alpha", "Use the alpha version of testnet")
    .setAction(async (args, hre) => {
        const artifactsPath = hre.config.paths.artifacts;
        const docker = await hre.dockerWrapper.getDocker();
        await traverseFiles(artifactsPath, hasCairoJsonExtension, file => {
            // TODO check not to deploy simple cairo
            const starknetArgs = ["deploy", "--contract", file];
            if (args.alpha) {
                starknetArgs.push("--network=alpha");
            }
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
        // TODO predicate function currently always returning true
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
