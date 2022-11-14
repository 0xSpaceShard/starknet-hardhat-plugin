import shell from "shelljs";

export function exec(cmd: string) {
    const result = shell.exec(cmd);
    if (result.code !== 0) {
        shell.exit(1);
    }

    return result;
}

export function contains(cmd: string, pattern: string, responseType?: string) {
    if (responseType === "stdout") {
        const res = shell.exec(cmd, { silent: true }).stdout;
        if (!res.includes(pattern)) {
            console.error("Pattern not in input");
            console.error("Pattern:", pattern);
            console.error("Input:", res);
            shell.exit(1);
        }
        return;
    }
    const res = shell.exec(cmd, { silent: true }).stderr;
    if (!res.includes(pattern)) {
        console.error("Pattern not in input");
        console.error("Pattern:", pattern);
        console.error("Input:", res);
        shell.exit(1);
    }
}

export function extractAddress(source: string, pattern: string) {
    // Replaces all line breaks with a space
    source = source.replace(/(\r\n|\n|\r)/gm, " ");
    // Take the first word in source after the pattern
    const res = source.split(pattern)[1].split(" ")[0];
    return res;
}

export function checkDevnetIsNotRunning(): void {
    const result = shell.exec("curl -s -o /dev/null -w \"%{http_code}\" http://127.0.0.1:5050/feeder_gateway/is_alive", { silent: true });
    if (result.code !== 0) {
        shell.echo("Devnet is not running!", result);
    }

    if (result.stdout !== "000") {
        shell.echo("Devnet is running and responded with status", result);
        shell.exit(1);
    }
}
