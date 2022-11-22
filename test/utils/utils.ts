import axios from "axios";
import { rmSync } from "fs";
import shell from "shelljs";
import { StarknetPluginError } from "../../src/starknet-plugin-error";

export function exec(cmd: string) {
    const result = shell.exec(cmd);
    if (result.code !== 0) {
        throw new StarknetPluginError(`Command ${cmd} failed.\n${result.stderr}`);
    }

    return result;
}

export function contains(output: string, pattern: string) {
    if (!output.includes(pattern)) {
        console.error("Pattern not in input");
        console.error("Pattern:", pattern);
        console.error("Input:", output);
        throw new StarknetPluginError("Pattern not in input");
    }
}

export function extractAddress(source: string, pattern: string) {
    // Replaces all line breaks with a space
    source = source.replace(/(\r\n|\n|\r)/gm, " ");
    // Take the first word in source after the pattern
    const res = source.split(pattern)[1].split(" ")[0];
    return res;
}

export async function checkDevnetIsNotRunning(url?: string): Promise<void> {
    url = url || "http://127.0.0.1:5050";
    try {
        const res = await axios.get(`${url}/is_alive`);
        console.log(`Devnet is running and responded with status ${res.status}`);
        throw new StarknetPluginError(`Devnet is running and responded with status ${res.status}`);
    } catch (err) {
        if (err.toJSON().code == "ECONNREFUSED") {
            console.log("Devnet is not running!");
        }
    }
}

export function ensureEnvVar(varName: string): string {
    if (!process.env[varName]) {
        throw new Error(`Env var ${varName} not set or empty`);
    }
    return process.env[varName] as string;
}

export function rmrfSync(path: string) {
    rmSync(path, { recursive: true, force: true });
}
