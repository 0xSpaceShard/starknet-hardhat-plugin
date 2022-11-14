import { checkDevnetIsNotRunning, exec } from "../../utils/utils";

checkDevnetIsNotRunning();
exec("npx hardhat starknet-compile contracts/contract.cairo");
exec("npx hardhat test --no-compile test/integrated-devnet-args.test.ts");
checkDevnetIsNotRunning();
