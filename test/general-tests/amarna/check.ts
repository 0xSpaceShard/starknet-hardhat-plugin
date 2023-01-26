import * as fs from "fs";
import { spawnSync } from "child_process";
import { assertEqual } from "../../utils/utils";

console.log("Amarna test");
console.log("-----------");
// This test needs less than 150sec

/**
 * The logic is like:
 * 1. Run amarna. Expect out.sarif file to be generated.
 * 2. After a few seconds see if file exists.
 * 3. Tried less than 20 times? Try again in a few seconds.
 * 4. Found the file? Mark the test result as passed.
 * 5. Number of tries exceeded 20? Test failed.
 */
console.log("should generate out.sarif file");
// Cleanup old sarif file if exists
fs.existsSync("./out.sarif") && fs.unlinkSync("./out.sarif");

console.log("Running amarna");

const output = spawnSync("npx", ["hardhat", "amarna"], { encoding: "utf-8" });
output.stdout && console.log(output.stdout);
output.stderr && console.error(output.stderr);

let status = "File not generated";
if (fs.existsSync("./out.sarif")) {
    // If the file exists, pass the test and remove the generated file.
    console.log("Success: sarif.out generated, cleaning up.");
    status = "sarif.out";
    fs.unlinkSync("./out.sarif"); // Cleanup out.sarif after the test
}
// See if the result is file generated

assertEqual(status, "sarif.out");
