import { checkDevnetIsNotRunning, contains, exec } from "../../utils/utils";

checkDevnetIsNotRunning();

exec("npx hardhat starknet-compile contracts/contract.cairo");
contains("npx hardhat test --no-compile test/integrated-devnet.test.ts", "starknet-devnet: error: --accounts must be a positive integer; got: invalid_value.");
