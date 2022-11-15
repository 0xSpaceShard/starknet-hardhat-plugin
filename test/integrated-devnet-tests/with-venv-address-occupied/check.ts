import { spawn } from "child_process";
import { checkDevnetIsNotRunning, contains, exec } from "../../utils/utils";
import shell from "shelljs";

const res = shell.exec("lsof -t -i:5050");
if (res.code === 0) {
    exec("kill -9 $(lsof -t -i:5050)");
}

checkDevnetIsNotRunning();

const cmd = "starknet-devnet --host 127.0.0.1 --port 5050 --accounts 0";
const args = cmd.split(" ").slice(1);

spawn("starknet-devnet", args, { detached: true });
exec("npx hardhat starknet-compile contracts/contract.cairo");

contains("npx hardhat test --no-compile test/integrated-devnet.test.ts", "127.0.0.1:5050 already occupied.");
