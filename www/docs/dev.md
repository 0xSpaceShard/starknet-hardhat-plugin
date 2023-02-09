# Contribute

## Set up development environment

### Clone the repository

```
$ git clone git@github.com:Shard-Labs/starknet-hardhat-plugin.git
$ cd starknet-hardhat-plugin
```

### Install dependencies

```
$ npm ci
```

### Compile

```
$ npm run build
```

### Set up the example repository

The `starknet-hardhat-example` repository is used to showcase and test this plugin's functionality.
Set it up following [its readme](https://github.com/Shard-Labs/starknet-hardhat-example#get-started), but after installing it, link it to use your local plugin repository:

```
$ cd <YOUR_PLUGIN_REPO_PATH>
$ npm link

$ cd <YOUR_EXAMPLE_REPO_PATH>
$ npm link @shardlabs/starknet-hardhat-plugin
```

If your IDE is reporting Typescript issues after compiling the plugin, you may want to restart the Typescript language server (e.g. in VS Code on Linux: Ctrl+Shift+P)

## Testing

A test case is added by creating a directory in a subdirectory of a test group in the `test` directory. E.g. `declare-test` is a test case in the `general-tests` test group. A test case should contain:

-   a `check.ts` script which does the testing logic
-   a `network.json` file which specifies on which networks should the test case be run
-   a `hardhat.config.ts` file will be used

The main testing script is `scripts/test.ts`. It iterates over the test cases the test group specified by the `TEST_SUBDIR` environment variable.

### Executing tests locally

When running tests locally, you probably don't want to run the whole `test.sh` script as it may alter your development environment. However, you can run individual tests by:

-   positioning yourself in your example repository
-   configuring the `hardhat.config.ts`
-   executing the `check.ts` script (potentially modifying it to address path differences)

To run all tests, you can use the `test-` scripts defined in `package.json`. For the tests to work, you may need to set the values from `config.json` as environment variables. You should also have the [`jq` CLI tool](https://stedolan.github.io/jq/) installed.

### Executing tests on CircleCI

If you're a member of the organization and you do a push to origin, you trigger CI/CD workflow on CircleCI. Track the progress on [the dashboard](https://circleci.com/gh/Shard-Labs/workflows/starknet-hardhat-plugin).

Sometimes the tests fail because of internal CircleCI or Starknet issues; in that case, you can try restarting the workflow.

Bear in mind that each workflow consumes credits. Track the spending [here](https://app.circleci.com/settings/plan/github/Shard-Labs/overview).

The whole workflow is defined in `.circleci/config.yml` - you may find it somewhat chaotic as it uses dependency caching (we kind of sacrificed config clarity for performance).

Script `scripts/set-alpha-vars.sh` expects account information to be set through environment variables. These variables are defined in [shardlabs CircleCI context](https://app.circleci.com/settings/organization/github/Shard-Labs/contexts/f7f363c6-f101-4ac8-9193-343c88da5fb0?return-to=https%3A%2F%2Fapp.circleci.com%2Fpipelines%2Fgithub%2FShard-Labs%2Fstarknet-hardhat-plugin). If you upload a new account (with new keys), you cannot modify existing variables but have to delete old ones and create new ones.

To skip running tests on CircleCI, add `[skip ci]` in the first 250 characters of the commit message.

### Testing network

The script `test.sh` runs tests on Devnet and Testnet (alpha-goerli). To skip running tests on Testnet, add `[skip testnet]` to the commit message.

### Creating a PR

When adding new functionality to the plugin, you will probably also have to create a PR to the `plugin` branch of `starknet-hardhat-example`. You can then modify the `test.sh` script to use your branch instead of the `plugin` branch.

If your reviewer makes an observation that requires a fix, after you push the commit with the fix, find the commit link on the PR conversation page, and reply to the reviewer by providing that link. In [this example](https://github.com/Shard-Labs/starknet-hardhat-plugin/pull/130#discussion_r913581807) the contributor even linked to the specific change of the commit - you don't have to do that if you made multiple smaller commits.

When the PR is ready to be merged, do `Squash and merge` and delete the branch.

## Adapting to a new Starknet / cairo-lang version

Since the plugin relies on [Devnet](https://github.com/Shard-Labs/starknet-devnet) in its tests, first an adapted version of Devnet might need to be released. Current versions of Devnet and cairo-lang used in tests are specified in `config.json`.

### In cairo-cli repo

When a new Starknet / cairo-lang version is released, a new `cairo-cli` Docker image can be released (probably without any adaptation). This is done through the CI/CD pipeline of [the cairo-cli-docker repository](https://github.com/Shard-Labs/cairo-cli-docker#build-a-new-image).

Likely places where the old version has to be replaced with the new version are `README.md` and `constants.ts`.

### In starknet-hardhat-example repo

Change the version in `hardhat.config.ts`. Recompile the contracts (only important for local usage).

## Architecture

### Wrapper

This plugin is a wrapper around Starknet CLI (tool installed with cairo-lang). E.g. when you do `hardhat starknet-compile` in a shell or `contractFactory.deploy()` in a Hardhat JS/TS script, you are making a subprocess that executes Starknet CLI's `starknet deploy`.

There are two wrappers around Starknet CLI. They are defined in [starknet-wrapper.ts](https://github.com/Shard-Labs/starknet-hardhat-plugin/blob/master/src/starknet-wrappers.ts) and both rely on a [proxy server](https://github.com/Shard-Labs/starknet-hardhat-plugin/blob/master/src/starknet_cli_wrapper.py) that imports `main` methods of `starknet` and `starknet-compile` and uses them to execute commands (this is a speedup since a subprocess importing the whole Starknet doesn't have to be spawned for each request).

-   Docker wrapper:
    -   runs Starknet CLI in a Docker container
    -   the default option
-   Venv wrapper:
    -   for users that already have `cairo-lang` installed
    -   faster than Docker wrapper - not necessarily true since Docker wrapper also started using a proxy server

### Accessing HardhatRuntimeEnvironment (hre)

Before v0.7.0 we didn't know how to export classes to users, since every class needed to have access to `hre`, which was passed on in `extendEnvironment`. After introducing dynamic `hre` importing, exporting clases has become a possibility:

```typescript
const hre = await import("hardhat");
```

In `types/starknet.ts`, classes are specified using `typeof`, e.g. `OpenZeppelinAccount: typeof OpenZeppelinAccount`. However, exporting classes this way doesn't export their type.

## Version management

When a push is done to the `master` branch and the version in `package.json` differs from the one published on `npm`, the release process is triggered.

The updating of `package.json` doesn't have to be done directly, but can be done by running

```
$ npm version <NEW_VERSION>
```

`NEW_VERSION` can be anything documented [here](https://docs.npmjs.com/cli/v8/commands/npm-version), but will most commonly be `patch`.

This will also update `package-lock.json`, create a new commit, and create a new git tag.

If for whatever reason the publishing workflow in CI/CD cannot be executed, the version can be released manually via `scripts/npm-publish.sh`, just be sure to have an NPM access token and that you have the rights to publish.

Apart from [npm](https://www.npmjs.com/package/@shardlabs/starknet-hardhat-plugin?activeTab=versions), releases are also tracked on [GitHub](https://github.com/Shard-Labs/starknet-hardhat-plugin/releases) with [git tags](https://github.com/Shard-Labs/starknet-hardhat-plugin/tags). Notice the prepended `v` in tag names.

When the tag is pushed:

```bash
$ git push origin <TAG_NAME>
```

the release can be made public [on GitHub](https://github.com/Shard-Labs/starknet-hardhat-plugin/releases/new). Automatic note generation can be used, augmented with usage and development changes (see past releases for reference).

Users should be notified about the usage related changes. This can be done on Telegram, [Discord](https://discord.com/channels/793094838509764618/912735106899275856), [Shamans](https://community.starknet.io/t/starknet-hardhat-plugin/67) etc.

### Docs

New documentation is **automatically** deployed after publishing a new version with `scripts/npm-publish.sh`.

To manually deploy new documentation, run:

```bash
$ cd www
$ npm ci
$ npm run deploy
```

### Example repo after a new version

After releasing a new plugin version, the `plugin` branch of the example repo should be updated and pushed:

-   `package.json` should be updated by running `npm install --save-exact @shardlabs/starknet-hardhat-plugin@<NEW_VERSION>`
-   The `master` branch, which serves as reference to the users, should be synchronized with the `plugin` branch. This can probably be done by doing `git reset plugin` while on `master`.
-   Since you did `npm install`, you may need to link again, as described [initially](#set-up-the-example-repository).
