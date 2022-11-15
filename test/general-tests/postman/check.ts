import { exec } from "../../utils/utils";
import shell from "shelljs";
import { spawn } from "child_process";

const res = shell.exec("lsof -t -i:8545");
if (res.code === 0) {
    exec("kill -9 $(lsof -t -i:8545)");
}

exec("npx hardhat starknet-compile contracts/l1l2.cairo");
const cmd = "npx hardhat node";
const args = cmd.split(" ").slice(1);

spawn("npx", args, { detached: true });
exec("sleep 1");

exec("npx hardhat test --network localhost test/postman.test.ts");
