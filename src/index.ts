import { spawnSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import { task } from "hardhat/config";

function getPythonCommand() {
    const reqMajor = 3;
    const minMinor = 7;
    const possibleCommands = ["python", "py", "python3", "python3.7", "python3.8", "python3.9"];

    for (const possibleCommand of possibleCommands) {
        const versionOutputBuffer = spawnSync(possibleCommand, ["--version"]).stdout;

        if (versionOutputBuffer) {
            const versionOutput = versionOutputBuffer.toString();
            const outputParts = versionOutput.split(" ");

            if (outputParts[0] === "Python") {
                const versionParts = outputParts[1].split(".");

                if (versionParts[0] === reqMajor.toString() && parseInt(versionParts[1]) >= minMinor) {
                    return possibleCommand;
                }
            }
        }
    }

    throw new Error(`Python version >= ${reqMajor}.${minMinor} required`);
}

function createVenv(pythonCommand: string, venvDir: string) {
    const pipPath = path.join(venvDir, "bin", "pip3");
    if (!fs.existsSync(pipPath)) {
        console.log(`Creating venv in ${venvDir}`);
        if (spawnSync(pythonCommand, ["-m", "venv", venvDir]).status) {
            throw new Error("Could not create venv");
        }
    }

    return {
        pipPath,
        cairoCompilePath: path.join(venvDir, "bin", "cairo-compile"),
        cairoRunPath: path.join(venvDir, "bin", "cairo-run"),
        starknetCompilePath: path.join(venvDir, "bin", "starknet-compile"),
        starknetPath: path.join(venvDir, "bin", "starknet")
    }
}

function installDependencies(pipPath: string, dependencies: string[]) {
    console.log("Checking dependencies");
    if (spawnSync(pipPath, ["install"].concat(dependencies)).status) {
        throw new Error("Installing dependencies failed");
    }
}

function traverseFiles(
    traversable: string,
    predicate: (path: string) => boolean,
    action: (path: string) => void
): void {
    const stats = fs.lstatSync(traversable);
    if (stats.isDirectory()) {
        for (const childName of fs.readdirSync(traversable)) {
            const childPath = path.join(traversable, childName);
            traverseFiles(childPath, predicate, action);
        }
    } else if (stats.isFile()) {
        if (predicate(traversable)) {
            action(traversable);
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

function getCompileFunction(compilerPath: string, contractsPath: string, artifactsPath: string) {
    const root = path.dirname(contractsPath);
    const rootRegex = new RegExp("^" + root);
    return (file: string) => {
        const suffix = file.replace(rootRegex, "");
        const outputPath = path.join(artifactsPath, suffix) + ".json";
        const compileArgs = [file, "--output", outputPath]; // TODO abi

        console.log("Compiling", file);
        const executed = spawnSync(compilerPath, compileArgs);
        for (const logLine of executed.output) {
            if (logLine) {
                console.log(logLine.toString());
            }
        }

        const finalMsg = executed.status ? "Compilation failed" : "Compilation succeeded";
        console.log(`\t${finalMsg}\n`);
    }
}

function main() {
    const pythonCommand = getPythonCommand();

    const venvName = "starknet_plugin_venv";
    const venvDir = path.join(__dirname, venvName);

    const paths = createVenv(pythonCommand, venvDir);

    installDependencies(paths.pipPath, ["ecdsa", "fastecdsa", "sympy", "cairo-lang"]);

    task("cairo-compile", "Compiles programs written in Cairo")
        .setAction(async (_args, hre) => {
            const sourcesPath = hre.config.paths.sources;
            const artifactsPath = hre.config.paths.artifacts;
            const compileFunction = getCompileFunction(paths.cairoCompilePath, sourcesPath, artifactsPath);
            traverseFiles(sourcesPath, isSimpleCairo, compileFunction);
        });

    task("starknet-compile", "Compiles StarkNet contracts")
        .setAction(async (_args, hre) => {
            const sourcesPath = hre.config.paths.sources;
            const artifactsPath = hre.config.paths.artifacts;
            const compileFunction = getCompileFunction(paths.starknetCompilePath, sourcesPath, artifactsPath);
            traverseFiles(sourcesPath, isStarknetContract, compileFunction);
        });

    task("starknet-deploy", "Deploys Starknet contracts")
        .addFlag("alpha", "Use the alpha version of testnet")
        .setAction(async (args, hre) => {
            traverseFiles(hre.config.paths.artifacts, hasCairoJsonExtension, file => {
                // TODO check not to deploy simple cairo
                console.log("Deploying", file);
                const starknetArgs = ["deploy", "--contract", file];
                if (args.alpha) {
                    starknetArgs.push("--network=alpha");
                }
                const executed = spawnSync(paths.starknetPath, starknetArgs);
                for (const logLine of executed.output) {
                    if (logLine) {
                        console.log(logLine.toString());
                    }
                }

                const finalMsg = executed.status ? "Deployment failed" : "Deployment succeeded";
                console.log(`\t${finalMsg}\n`);
            })
        });
}

main();
