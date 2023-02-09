import * as fs from "fs";
import { spawnSync } from "child_process";
import { assertExistence } from "../../utils/utils";

// Cleanup old sarif file if exists
fs.existsSync("./out.sarif") && fs.unlinkSync("./out.sarif");

console.log("Running amarna");

const output = spawnSync("npx", ["hardhat", "amarna"], { encoding: "utf-8" });
output.stdout && console.log(output.stdout);
output.stderr && console.warn(output.stderr);

assertExistence("./out.sarif");
fs.unlinkSync("./out.sarif"); // Cleanup out.sarif after the test
