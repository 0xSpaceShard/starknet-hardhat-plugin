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
        if (spawnSync(pythonCommand, ["-m", "venv", venvDir]).error) {
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
    if (spawnSync(pipPath, ["install"].concat(dependencies)).error) {
        throw new Error("Installing dependencies failed");
    }
}

function main() {
    const pythonCommand = getPythonCommand();

    const venvName = "starknet_plugin_venv";
    const venvDir = path.join(__dirname, venvName);

    const paths = createVenv(pythonCommand, venvDir);

    installDependencies(paths.pipPath, ["ecdsa", "fastecdsa", "sympy", "cairo-lang"]);

    task("cairo-compile", "Compiles programs written in Cairo")
        .setAction((args) => {
            spawnSync(paths.cairoCompilePath);
            return null;
        });
    
    task("starknet-compile", "Compiles StarkNet contracts")
        .setAction((args) => {
            spawnSync(paths.starknetCompilePath);
            return null;
        });

    task("starknet-deploy", "Deploys Starknet contracts")
        .setAction((args) => {
            spawnSync(paths.starknetPath);
            return null;
        });
}

main();
