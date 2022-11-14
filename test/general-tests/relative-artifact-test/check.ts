import { exec } from "../../utils/utils";

exec("npx hardhat starknet-compile contracts/contract.cairo contracts/util.cairo");

exec("cp -a starknet-artifacts/contracts test/test-artifacts");

exec("npx hardhat test --no-compile test/relative-artifacts.test.ts");
