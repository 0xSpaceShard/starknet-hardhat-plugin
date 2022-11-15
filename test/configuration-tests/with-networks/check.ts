import { contains, exec } from "../../utils/utils";
import path from "path";


exec("npx hardhat starknet-compile contracts/contract.cairo");
const ARTIFACT_PATH = "starknet-artifacts/contracts/contract.cairo/";
const INVALID_NETWORK = "foo";
const EXPECTED = "Error in plugin Starknet: Invalid network provided in starknet.network in hardhat.config: foo.";
const PREFIX = path.join(__dirname);

console.log("Testing no starknet network");
exec(`npx hardhat starknet-deploy ${ARTIFACT_PATH} --inputs 10 2>&1 \
| tail -n +2 \
| diff - ${path.join(PREFIX, "without-starknet-network.txt")}`);
console.log("Success");

console.log("Testing invalid CLI network");
exec(`npx hardhat starknet-deploy --starknet-network ${INVALID_NETWORK} ${ARTIFACT_PATH} --inputs 10 2>&1 \
| tail -n +2 \
| diff - ${path.join(PREFIX, "invalid-cli-network.txt")}`);
console.log("Success");

console.log("Testing no mocha network");
exec("NETWORK='' npx hardhat test --no-compile test/contract-factory-test.ts");
console.log("Success");

console.log("Testing invalid config network");
contains(`NETWORK=${INVALID_NETWORK} npx hardhat test --no-compile test/contract-factory-test.ts`, EXPECTED);
console.log("Success");
