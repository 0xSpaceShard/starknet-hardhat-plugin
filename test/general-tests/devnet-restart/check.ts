import { exec } from "../../utils/utils";

exec("npx hardhat starknet-compile contracts/contract.cairo");
exec("npx hardhat test --no-compile test/devnet-restart.test.ts");