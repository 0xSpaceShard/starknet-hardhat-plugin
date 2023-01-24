import axios from "axios";
import assert, { AssertionError } from "assert";
import { existsSync, rmSync } from "fs";
import shell from "shelljs";
import { DEVNET_URL } from "../constants/constants";

export function exec(cmd: string) {
    const result = shell.exec(cmd);
    assertEqual(result.code, 0, `Command ${cmd} failed.\n${result.stderr}`);

    return result;
}

export function assertContains(output: string, pattern: string) {
    if (!output.includes(pattern)) {
        throw new AssertionError({
            message: `Pattern not in input\nPattern: ${pattern}\nInput: ${output}`
        });
    }
}

export function extractAddress(source: string, pattern: string) {
    // Replaces all line breaks with a space
    source = source.replace(/(\r\n|\n|\r)/gm, " ");
    // Take the first word in source after the pattern
    const res = source.split(pattern)[1].split(" ")[0];
    return res;
}

export async function checkDevnetIsNotRunning(url = DEVNET_URL): Promise<void> {
    try {
        const res = await axios.get(`${url}/is_alive`);
        throw new AssertionError({
            message: `Devnet is running and responded with status ${res.status}`
        });
    } catch (err) {
        console.log("Devnet is not running!");
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

export function assertEqual(val1: unknown, val2: unknown, msg?: string) {
    assert.equal(val1, val2, msg);
}

export function assertNotEqual(val1: unknown, val2: unknown, msg?: string) {
    assert.notEqual(val1, val2, msg);
}

export function assertExistence(path: string, expected = true) {
    if (existsSync(path) !== expected) {
        const message = `Expected ${path} to ${expected ? "" : "not "}exist`;
        throw new AssertionError({ message });
    }
}
