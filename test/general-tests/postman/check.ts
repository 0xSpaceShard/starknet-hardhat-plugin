import { exec } from "../../utils/utils";

exec("trap 'kill $(jobs -p)' EXIT");

exec("npx hardhat starknet-compile contracts/l1l2.cairo");
exec(`npx hardhat node &
sleep 1`);

exec("npx hardhat test --network localhost test/postman.test.ts");
