import * as path from "path";
import * as fs from "fs";
import { task, extendEnvironment, extendConfig } from "hardhat/config";
import { HardhatPluginError, lazyObject } from "hardhat/plugins";
import { ProcessResult } from "@nomiclabs/hardhat-docker";
import "./type-extensions";
import { DockerWrapper, StarknetContractFactory } from "./types";
import { PLUGIN_NAME, ABI_SUFFIX, DEFAULT_STARKNET_SOURCES_PATH, DEFAULT_STARKNET_ARTIFACTS_PATH, DEFAULT_DOCKER_IMAGE_TAG, DOCKER_REPOSITORY, DEFAULT_STARKNET_NETWORK, ALPHA_URL } from "./constants";
import { HardhatConfig, HardhatRuntimeEnvironment, HardhatUserConfig, HttpNetworkConfig } from "hardhat/types";
import { adaptLog, adaptUrl } from "./utils";

async function traverseFiles(
    traversable: string,
    predicate: (path: string) => boolean,
    action: (path: string) => Promise<number>
): Promise<number> {
    let statusCode = 0;

    if (fs.existsSync(traversable)) {
        const stats = fs.lstatSync(traversable);
        if (stats.isDirectory()) {
            for (const childName of fs.readdirSync(traversable)) {
                const childPath = path.join(traversable, childName);
                statusCode += await traverseFiles(childPath, predicate, action);
            }
        } else if (stats.isFile()) {
            if (predicate(traversable)) {
                statusCode += await action(traversable);
            }
        } else {
            const msg = `Can only interpret files and directories. ${traversable} is neither.`;
            console.warn(msg);
        }
    } else {
        statusCode = 1;
        console.error("Path doesn't exist:", traversable);
    }
        
    return statusCode;
}

/**
 * Transfers logs and generates a return status code.
 * 
 * @param executed The process result of running the container
 * @returns 0 if succeeded, 1 otherwise
 */
function processExecuted(executed: ProcessResult): number {
    if (executed.stdout.length) {
        console.log(adaptLog(executed.stdout.toString()));
    }

    if (executed.stderr.length) {
        // synchronize param names reported by actual CLI with param names used by this plugin
        const err = executed.stderr.toString();
        const replacedErr = adaptLog(err);
        console.error(replacedErr);
    }

    const finalMsg = executed.statusCode ? "Failed" : "Succeeded";
    console.log(`\t${finalMsg}\n`);
    return executed.statusCode ? 1 : 0;
}

function hasCairoExtension(filePath: string) {
    return path.extname(filePath) === ".cairo";
}

function isStarknetContract(filePath: string) {
    return hasCairoExtension(filePath);
}

function isStarknetCompilationArtifact(filePath: string) {
    const content = fs.readFileSync(filePath).toString();
    let parsed = null;
    try {
        parsed = JSON.parse(content);
    } catch(err) {
        return false;
    }

    return !!parsed.entry_points_by_type;
}

function getFileName(filePath: string) {
    return path.basename(filePath, path.extname(filePath));
}

function addPaths(pathsObj: any, colonSeparatedStr: string): void {
    for (let p of colonSeparatedStr.split(":")) {
        if (!path.isAbsolute(p)) {
            throw new HardhatPluginError(PLUGIN_NAME, `Path is not absolute: ${p}`);
        }

        // strip trailing slash(es)
        p = p.replace(/\/*$/, "");

        // duplicate paths will cause errors
        if (`${p}/` in pathsObj) {
            continue;
        }
        pathsObj[p] = p;
    }
}

// add sources path
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    let newPath: string;
    if (userConfig.paths && userConfig.paths.starknetSources) {
        const userPath = userConfig.paths.starknetSources;
        if (path.isAbsolute(userPath)) {
            newPath = userPath;
        } else {
            newPath = path.normalize(path.join(config.paths.root, userPath));
        }
        config.paths.starknetSources = userConfig.paths.starknetSources;
    } else {
        const defaultPath = path.join(config.paths.root, DEFAULT_STARKNET_SOURCES_PATH);
        newPath = defaultPath;
    }

    config.paths.starknetSources = newPath;
});

// add artifacts path
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    let newPath: string;
    if (userConfig.paths && userConfig.paths.starknetArtifacts) {
        const userPath = userConfig.paths.starknetArtifacts;
        if (path.isAbsolute(userPath)) {
            newPath = userPath;
        } else {
            newPath = path.normalize(path.join(config.paths.root, userPath));
        }
        config.paths.starknetArtifacts = userConfig.paths.starknetArtifacts;
    } else {
        const defaultPath = path.join(config.paths.root, DEFAULT_STARKNET_ARTIFACTS_PATH);
        newPath = defaultPath;
    }

    config.paths.starknetArtifacts = newPath;
});

// add image version
extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
    config.cairo = userConfig.cairo;
    if (!config.cairo) {
        config.cairo = {
            version: DEFAULT_DOCKER_IMAGE_TAG
        };
    }

    if (!config.cairo.version) {
        config.cairo.version = DEFAULT_DOCKER_IMAGE_TAG;
    }
});

// add url to alpha network
extendConfig((config: HardhatConfig) => {
    if (config.networks.alpha) {
        return;
    }
    config.networks.alpha = {
        url: ALPHA_URL,
        gas: undefined,
        gasPrice: undefined,
        accounts: undefined,
        timeout: undefined,
        gasMultiplier: undefined,
        httpHeaders: undefined
    };
});

extendEnvironment(hre => {
    const repository = DOCKER_REPOSITORY;
    const tag = hre.config.cairo.version;
    hre.dockerWrapper = new DockerWrapper({ repository, tag });
});

task("starknet-compile", "Compiles Starknet contracts")
    .addOptionalVariadicPositionalParam("paths",
        "The paths to be used for deployment.\n" +
        "Each of the provided paths is recursively looked into while searching for compilation artifacts.\n" +
        "If no paths are provided, the default contracts directory is traversed."
    )
    .addOptionalParam("cairoPath",
        "Allows specifying the locations of imported files, if necessary.\n" +
        "Separate them with a colon (:), e.g. --cairo-path='path/to/lib1:path/to/lib2'"
    )
    .setAction(async (args, hre) => {
        const docker = await hre.dockerWrapper.getDocker();

        const root = hre.config.paths.root;
        const rootRegex = new RegExp("^" + root);

        const defaultSourcesPath = hre.config.paths.starknetSources;
        const sourcesPaths: string[] = args.paths || [defaultSourcesPath];
        const artifactsPath = hre.config.paths.starknetArtifacts;

        let statusCode = 0;
        for (let sourcesPath of sourcesPaths) {
            if (!path.isAbsolute(sourcesPath)) {
                sourcesPath = path.normalize(path.join(root, sourcesPath));
            }

            statusCode += await traverseFiles(sourcesPath, isStarknetContract, async (file: string): Promise<number> => {
                console.log("Compiling", file);
                const suffix = file.replace(rootRegex, "");
                const fileName = getFileName(suffix);
                const dirPath = path.join(artifactsPath, suffix);

                const outputPath = path.join(dirPath, `${fileName}.json`);
                const abiPath = path.join(dirPath, `${fileName}${ABI_SUFFIX}`);
                const cairoPath = (defaultSourcesPath + ":" + root) + (args.cairoPath ? ":" + args.cairoPath : "");

                const compileArgs = [
                    file,
                    "--output", outputPath,
                    "--abi", abiPath,
                    "--cairo_path", cairoPath,
                ];

                const binds = {
                    [sourcesPath]: sourcesPath,
                    [artifactsPath]: artifactsPath,
                };
                addPaths(binds, cairoPath);

                fs.mkdirSync(dirPath, { recursive: true });
                const executed = await docker.runContainer(
                    hre.dockerWrapper.image,
                    ["starknet-compile"].concat(compileArgs),
                    {
                        binds
                    }
                );

                return processExecuted(executed);
            });
        }

        if (statusCode) {
            const msg = `Failed compilation of ${statusCode} contract${statusCode === 1 ? "" : "s"}.`;
            throw new HardhatPluginError(PLUGIN_NAME, msg);
        }
    });

/**
 * Extracts gatewayUrl from args or process.env.STARKNET_NETWORK. Sets hre.starknet.network if provided.
 *
 * @param args the object containing CLI args
 * @param hre environment whose networks and starknet.network are accessed
 * @returns the URL of the gateway to be used
 */
function getGatewayUrl(args: any, hre: HardhatRuntimeEnvironment): string {
    let gatewayUrl: string = args.gatewayUrl;
    const networkName: string = args.starknetNetwork || process.env.STARKNET_NETWORK;

    if (gatewayUrl && !networkName) {
        return gatewayUrl;
    }

    if (gatewayUrl && networkName) {
        const msg = "Only one of starknet-network and gateway-url should be provided.";
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    if (!networkName) { // we already know no gatewayUrl is provided
        const msg = "No starknet-network or gateway-url provided."
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    hre.starknet.network = networkName;
    const httpNetwork = <HttpNetworkConfig> hre.config.networks[networkName];
    if (!httpNetwork) {
        const msg = `Unknown starknet-network provided: ${networkName}`;
        throw new HardhatPluginError(PLUGIN_NAME, msg);
    }

    const adaptedUrl = adaptUrl(httpNetwork.url);
    return adaptedUrl;
}

task("starknet-deploy", "Deploys Starknet contracts which have been compiled.")
    .addOptionalParam("starknetNetwork", "The network version to be used (e.g. alpha)")
    .addOptionalParam("gatewayUrl", `The URL of the gateway to be used (e.g. ${ALPHA_URL}`)
    .addOptionalVariadicPositionalParam("paths",
        "The paths to be used for deployment.\n" +
        "Each of the provided paths is recursively looked into while searching for compilation artifacts.\n" +
        "If no paths are provided, the default artifacts directory is traversed."
    ).setAction(async (args, hre) => {
        const docker = await hre.dockerWrapper.getDocker();

        const gatewayUrl = getGatewayUrl(args, hre);
        const defaultArtifactsPath = hre.config.paths.starknetArtifacts;
        const artifactsPaths: string[] = args.paths || [defaultArtifactsPath];

        let statusCode = 0;
        for (let artifactsPath of artifactsPaths) {
            if (!path.isAbsolute(artifactsPath)) {
                artifactsPath = path.normalize(path.join(hre.config.paths.root, artifactsPath));
            }

            statusCode += await traverseFiles(artifactsPath, isStarknetCompilationArtifact, async file => {
                console.log("Deploying", file);
                const executed = await docker.runContainer(
                    hre.dockerWrapper.image,
                    [
                        "starknet", "deploy",
                        "--contract", file,
                        "--gateway_url", gatewayUrl
                    ],
                    {
                        binds: {
                            [artifactsPath]: artifactsPath
                        },
                        networkMode: "host"
                    }
                );

                return processExecuted(executed);
            });
        }

        if (statusCode) {
            throw new HardhatPluginError(PLUGIN_NAME, `Failed deployment of ${statusCode} contracts`);
        }
    });

async function findPath(traversable: string, name: string) {
    let foundPath: string;
    await traverseFiles(
        traversable,
        file => path.basename(file) === name,
        async file => {
            foundPath = file;
            return 0;
        }
    );
    return foundPath;
}

extendEnvironment(hre => {
    hre.starknet = {
        getContractFactory: async contractName => {
            const metadataPath = await findPath(hre.config.paths.starknetArtifacts, `${contractName}.json`);
            if (!metadataPath) {
                throw new HardhatPluginError(PLUGIN_NAME, `Could not find metadata for ${contractName}`);
            }

            const abiPath = await findPath(hre.config.paths.starknetArtifacts, `${contractName}${ABI_SUFFIX}`);
            if (!abiPath) {
                throw new HardhatPluginError(PLUGIN_NAME, `Could not find ABI for ${contractName}`);
            }

            const testNetworkName = hre.config.mocha.starknetNetwork || DEFAULT_STARKNET_NETWORK;
            const testNetwork: HttpNetworkConfig = <HttpNetworkConfig> hre.config.networks[testNetworkName];
            if (!testNetwork) {
                const msg = `Network ${testNetworkName} is specified under "mocha.starknetNetwork", but not defined in "networks".`;
                throw new HardhatPluginError(PLUGIN_NAME, msg);
            }

            if (!testNetwork.url) {
                throw new HardhatPluginError(PLUGIN_NAME, `Cannot use network ${testNetworkName}. No "url" specified.`);
            }

            return new StarknetContractFactory({
                dockerWrapper: hre.dockerWrapper,
                metadataPath,
                abiPath,
                gatewayUrl: testNetwork.url,
                feederGatewayUrl: testNetwork.url
            });
        }
    };
});
