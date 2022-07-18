## Set up development environment

### Clone the repository

```
git clone git@github.com:Shard-Labs/starknet-hardhat-plugin.git
cd starknet-hardhat-plugin
```

### Install dependencies

```
npm ci
```

### Compile

```
npm run build
```

### Set up the example repository

The `starknet-hardhat-example` repository to showcase and test this plugin's functionality.
Set it up following [its readme](https://github.com/Shard-Labs/starknet-hardhat-example#get-started), but after installing it, make it use your local plugin repository:

```
cd <YOUR_PLUGIN_REPO_PATH>
npm link

cd <YOUR_EXAMPLE_REPO_PATH>
npm link @shardlabs/starknet-hardhat-plugin
```

If your IDE is reporting Typescript issues after compiling the plugin, you may want to restart the Typescript language server (e.g. in VS Code on Linux: Ctrl+Shift+P)

## Testing

A test case is added by adding a directory in a subdirectory of a test group in the `test` directory. E.g. `declare-test` is a test case in the `general-tests` test group. The test case should contain:

-   a `check.sh` script which does the testing logic
-   a `network.json` file which specifies on which networks should the test case be run
-   a `hardhat.config.ts` file will be used

The main testing script is `scripts/test.sh`. It iterates over the test cases the test group specified by the `TEST_SUBDIR` environment variable.

### Executing tests locally

When running tests locally, you probably don't want to run the whole `test.sh` script as it may alter your development environment. However, you can run individual tests by:

-   positioning yourself in your example repository
-   configuring the `hardhat.config.ts`
-   executing the `check.sh` script (potentially modifying it to address path differences)

To run all tests, you can use the `test-` scripts defined in `package.json`. For the tests to work, you may need to set the values from `config.json` as environment variables.

### Executing tests on CircleCI

When you do a push to origin, you trigger CI/CD workflow on CircleCI. Track the progress on [the dashboard](https://circleci.com/gh/Shard-Labs/workflows/starknet-hardhat-plugin).

### Creating a PR

When adding new functionality to the plugin, you will probably also have to create a PR to the `plugin` branch of `starknet-hardhat-example`.

## Architecture

### Wrapper

This plugin is a wrapper around Starknet CLI (tool installed with cairo-lang). E.g. when you do `hardhat starknet-deploy` in a shell or `contractFactory.deploy()` in a Hardhat JS/TS script, you are making a subprocess that executes Starknet CLI's `starknet deploy`.

There are two wrappers around the Starknet CLI, defined in [starknet-wrapper.ts](/src/starknet-wrappers.ts):

-   Docker wrapper:
    -   runs Starknet CLI in a Docker container
    -   the default option
-   Venv wrapper:
    -   for users that already have `cairo-lang` installed
    -   faster than Docker wrapper

## Version management

When a push is done to the `master` branch and the version in `package.json` differs from the one published on `npm`, the release process is triggered. Releases are also tracked on [GitHub](https://github.com/Shard-Labs/starknet-hardhat-plugin/releases) with [git tags](https://github.com/Shard-Labs/starknet-hardhat-plugin/tags).
