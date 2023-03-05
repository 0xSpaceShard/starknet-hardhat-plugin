./scripts/ensure-python.sh

# setup example repo
rm -rf starknet-hardhat-example
EXAMPLE_REPO_BRANCH="plugin"
# Empty default for CIRCLE_BRANCH
if [[ "${CIRCLE_BRANCH:=}" == "master" ]] && [[ "$EXAMPLE_REPO_BRANCH" != "plugin" ]]; then
    echo "Invalid example repo branch: $EXAMPLE_REPO_BRANCH"
    exit 1
fi

git clone -b "$EXAMPLE_REPO_BRANCH" --single-branch https://github.com/Shard-Labs/starknet-hardhat-example.git
cd starknet-hardhat-example
git log -n 1
npm ci
npm install ../ # install plugin from source (parent dir)

# if docker is available on the system pull docker image
CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG=$(node -e "console.log(require('../dist/src/constants.js').CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG)")

if docker --version >/dev/null 2>&1; then
    docker pull "$CAIRO_CLI_DOCKER_REPOSITORY_WITH_TAG"
fi

# used by some cases
../scripts/setup-venv.sh

../scripts/install-devnet.sh