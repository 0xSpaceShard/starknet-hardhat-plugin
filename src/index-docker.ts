import * as path from "path";
import * as fs from "fs";
import { task, extendEnvironment } from "hardhat/config";
import { HardhatDocker, Image } from "@nomiclabs/hardhat-docker";
import "./type-extensions";
import { DockerWrapper } from "./types";

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

        console.log("Compiling", file);
        const executed = await docker.runContainer(
            image,
            [compilerCommand].concat(compileArgs),
            {
                binds: {
                    [contractsPath]: contractsPath,
                    [artifactsPath]: artifactsPath
                }
            }
        );
        console.log(executed.stdout.toString());

        const finalMsg = executed.statusCode ? "Compilation failed" : "Compilation succeeded";
        console.log(`\t${finalMsg}\n`);
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
        await traverseFiles(artifactsPath, hasCairoJsonExtension, async file => {
            // TODO check not to deploy simple cairo
            console.log("Deploying", file);
            const starknetArgs = ["deploy", "--contract", file];
            if (args.alpha) {
                starknetArgs.push("--network=alpha");
            }
            const executed = await docker.runContainer(
                hre.dockerWrapper.image,
                ["starknet"].concat(starknetArgs),
                {
                    binds: {
                        [artifactsPath]: artifactsPath
                    }
                }
            );

            if (executed.stdout.length) {
                console.log(executed.stdout.toString());
            }

            if (executed.stderr.length) {
                console.log(executed.stderr.toString());
            }

            const finalMsg = executed.statusCode ? "Deployment failed" : "Deployment succeeded";
            console.log(`\t${finalMsg}\n`);
        });
    });
