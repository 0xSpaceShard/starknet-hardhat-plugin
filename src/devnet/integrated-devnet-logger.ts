import * as path from "path";
import * as fs from "fs";

export class IntegratedDevnetLogger {

    // Promisify fs
    protected fsPromises = fs.promises;

    constructor(protected stdout?: string, protected stderr?: string) {
        if (this.logToFile(this.stdout)) {
            this.checkFileExists(this.stdout);
        }

        if (this.logToFile(this.stderr)) {
            this.checkFileExists(this.stderr);
        }
    }

    // Checks if the file exists
    private async checkFileExists(filePath: string): Promise<void> {
        const file = path.resolve(filePath);
        // Create the file if it doesn't exist
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) {
            await this.fsPromises.mkdir(dir, { recursive: true });
        }

        if (!fs.existsSync(file)) {
            await this.fsPromises.writeFile(file, "");
        }
    }

    public async logStdout(message: string): Promise<void> {
        // STDOUT
        if (this.stdout === "STDOUT") {
            console.log(message);
            return;
        }

        // Check if stdout is a path to a file and is basename is not empty
        if (this.logToFile(this.stdout)) {
            // Create the file if it doesn't exist
            const file = path.resolve(this.stdout);
            this.appendLogToFile(file, message);
        }
    }

    public async logStderr(message: string): Promise<void> {
        // STDERR
        if (this.stderr === "STDERR") {
            console.error(message);
            return;
        }

        // Check if stderr is a path to a file and basename is not empty
        if (this.logToFile(this.stderr)) {
            // Create the file if it doesn't exist
            const file = path.resolve(this.stderr);
            await this.appendLogToFile(file, message);
        }
    }

    public logToFile(file?: string): boolean {
        if (file && path.basename(file) !== "" && path.extname(file) !== "") {
            return true;
        } else {
            return false;
        }
    }

    // Appends the message to the file
    private async appendLogToFile(file: string, message: string): Promise<void> {
        // Append the message to the file
        await this.fsPromises.appendFile(file, message);
    }
}
