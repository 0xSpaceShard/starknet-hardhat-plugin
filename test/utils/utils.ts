import shell from "shelljs";

export function exec(cmd: string) {
    const result = shell.exec(cmd);
    if (result.code !== 0) {
        shell.exit(1);
    }

    return result;
}

export function contains(cmd: string, pattern: string) {
    const res = shell.exec(cmd, { silent: true }).stderr; // Also needed for stdout
    if (!res.includes(pattern)) {
        console.error("Pattern not in input");
        console.error("Pattern:", pattern);
        console.error("Input:", res);
        shell.exit(1);
    }
}
