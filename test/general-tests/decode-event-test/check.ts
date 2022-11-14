import { exec } from "../../utils/utils";

exec("npx hardhat starknet-compile contracts/events.cairo");
exec("npx hardhat test --no-compile test/decode-events.test.ts");
