import * as path from "path";
import * as fs from "fs";

export class IntegratedDevnetLogger {

    constructor(protected stdout?: string, protected stderr?: string) {
        this.checkFileExists(this.stdout);
        this.checkFileExists(this.stderr);
    }

    // Checks if the file exists
    private async checkFileExists(filePath: string): Promise<void> {
        if (!filePath || filePath === "STDOUT" || filePath === "STDERR") return;
        const file = path.resolve(filePath);
        // Create the file if it doesn't exist
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }

        if (!fs.existsSync(file)) {
            await fs.promises.writeFile(file, "");
        }
    }

    public async logHandler(logTarget: string, message: string): Promise<void> {
        if (!logTarget) return;

        if (logTarget === "STDOUT") {
            console.log(message);
            return;
        }

        if (logTarget === "STDERR") {
            console.error(message);
            return;
        }

        // Append the message to the target log file
        this.appendLogToFile(logTarget, message);
    }

    public isFile(file: string): boolean {
        return fs.existsSync(file);
    }

    // Appends the message to the file
    private async appendLogToFile(file: string, message: string): Promise<void> {
        await fs.promises.appendFile(file, message);
    }
}
