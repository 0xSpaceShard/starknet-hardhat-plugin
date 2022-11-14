import { exec } from "../../utils/utils";

exec("npx hardhat starknet-compile");
exec("npx hardhat test --no-compile test/path-test.ts");
