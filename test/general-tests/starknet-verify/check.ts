import { assertEqual, ensureEnvVar, exec } from "../../utils/utils";
import { hardhatStarknetCompileDeprecated, hardhatStarknetVerify } from "../../utils/cli-functions";
import axios from "axios";

console.log(
    "The starknet-verify test is too flaky so it is temporarily suspended. Make sure it's working!"
);
process.exit(0);

const network = ensureEnvVar("NETWORK");

const mainContract = "contracts/contract.cairo";
const utilContract = "contracts/util.cairo";

hardhatStarknetCompileDeprecated(`${mainContract} ${utilContract}`.split(" "));

throw new Error("Missing code: Deploy with salt and extract address");
const address = "";

console.log("Sleeping to allow Voyager to index the deployment");
exec("sleep 1m");

hardhatStarknetVerify(
    `--starknet-network ${network} --path ${mainContract} ${utilContract} --address ${address} --compiler-version 0.9.0 --license "No License (None)"`.split(
        " "
    )
);
console.log("Sleeping to allow Voyager to register the verification");
exec("sleep 15s");

(async () => {
    const { data } = await axios.get(
        `https://goerli-2.voyager.online/api/contract/${address}/code`
    );
    assertEqual(data.abiVerified, "true", "Contract is not verified");
})();
