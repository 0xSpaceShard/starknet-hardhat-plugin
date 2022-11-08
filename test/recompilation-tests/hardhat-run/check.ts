import shell from "shelljs";
import { exec } from "../../utils/utils";

shell.echo("should recompile with deleted artifact on hardhat run");
shell.rm("-rf", "starknet-artifacts/contracts/contract.cairo");
exec("npx hardhat run scripts/deploy.ts");

shell.echo("should recompile with cache file deleted on hardhat run");
shell.rm("-rf", "cache/cairo-files-cache.json");
exec("npx hardhat run scripts/deploy.ts");
