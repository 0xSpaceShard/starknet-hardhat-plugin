import { exec } from "../../utils/utils";

exec("npx hardhat starknet-compile contracts/contract.cairo contracts/simple_storage.cairo contracts/empty_constructor.cairo");
exec("npx hardhat test --no-compile test/constructor.test.ts");
