import path from "path";
import { exec, extractAddress } from "../../utils/utils";

const NETWORK = process.env.NETWORK;

exec("npx hardhat starknet-compile contracts/contract.cairo");
const output = exec(`npx hardhat starknet-deploy --starknet-network ${NETWORK} starknet-artifacts/contracts/contract.cairo/ --inputs 10`);

const ADDRESS = extractAddress(output.stdout, "Contract address: ");
const PREFIX = path.join(__dirname);

console.log("Testing no input argument");
exec(`npx hardhat starknet-invoke --starknet-network ${NETWORK} --contract contract --function increase_balance --address ${ADDRESS} 2>&1 \
    | tail -n +6 \
    | diff - ${path.join(PREFIX, "no-inputs.txt")}`);
console.log("Success");

console.log("Testing too few input arguments");
exec(`npx hardhat starknet-invoke --starknet-network ${NETWORK} --contract contract --function increase_balance --address ${ADDRESS} --inputs 10 2>&1 \
    | tail -n +6 \
    | diff - ${path.join(PREFIX, "too-few-inputs.txt")}`);
console.log("Success");

console.log("Testing too many input arguments");
exec(`npx hardhat starknet-invoke --starknet-network ${NETWORK} --contract contract --function increase_balance --address ${ADDRESS} --inputs "10 20 30" 2>&1 \
    | tail -n +6 \
    | diff - ${path.join(PREFIX, "too-many-inputs.txt")}`);
console.log("Success");

console.log("The success case of starknet-invoke test is temporarily disabled.");
console.log("To enable it back, uncomment the lines in its check.sh.");
// console.log("Testing success case");
// exec(`npx hardhat starknet-invoke --starknet-network ${NETWORK} --contract contract --function increase_balance --address ${ADDRESS} --inputs "10 20" 2>&1 \
//     | tail -n +2\
//     | head -n -5\
//     | diff - <(echo "Invoke transaction was sent.")`);
// console.log("Success");
