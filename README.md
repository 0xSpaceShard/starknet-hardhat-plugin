## Building
The Hardhat team still needs to publish [this fix](https://github.com/nomiclabs/hardhat/commit/0474e596a1235c80773fa9a31b80b50e068b589c), so until then, do it manually.

As this is an early stage of the project, you need to build the plugin locally with:
```shell
npm run build
```

Since it is not yet published, building the image is required:
```shell
docker build -t starknet .
```

Assuming you have initialized a Hardhat project in which you wish to include this plugin, the next step would be to add to your project's `hardhat.config.js` (or .ts) the following line, targeting the path of the built plugin:
```javascript
require("<your_path>/starknet-hardhat-plugin/dist/index");
```

## Using
The plugin adds the following tasks which target the default sources/artifacts directories:
- cairo-compile (`npx hardhat cairo-compile`)
- starknet-compile (`npx hardhat starknet-compile`)
- starknet-deploy (with optional flag) (`npx hardhat starknet-deploy --alpha`)
