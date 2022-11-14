import { exec } from "../../utils/utils";

exec("npx hardhat starknet-compile contracts/contract.cairo contracts/deployer.cairo");
exec("npx hardhat test --no-compile test/declare-deploy.test.ts");
