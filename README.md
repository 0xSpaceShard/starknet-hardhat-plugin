## Building
As this is an early stage of the project, you need to build the plugin locally with:
```shell
npm run build
```

The plugin uses a Docker image, and since it is not yet published, building it is required:
```shell
docker build -t starknet .
```

Assuming you have initialized a Hardhat project in which you wish to include this plugin, the next step would be to add to your project's `hardhat.config.js` (or .ts) the following line, targeting the path of the built plugin:
```javascript
require("<your_path>/starknet-hardhat-plugin/dist/index");
```

## Using
The plugin adds the following tasks which target the default source/artifact/test directories:
- starknet-compile (`npx hardhat starknet-compile`)
- starknet-deploy (with optional flags) (`npx hardhat starknet-deploy --starknet-network <NAME> --gateway-url <URL>`)
- starknet-test (`npx hardhat starknet-test`)
