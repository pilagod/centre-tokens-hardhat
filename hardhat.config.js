require("dotenv/config");

require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

const accounts = [process.env.OPERATOR_PRIVATE_KEY];

module.exports = {
  networks: {
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_NODE_RPC_URL,
      accounts,
    },
    goerli: {
      chainId: 5,
      url: process.env.GOERLI_NODE_RPC_URL,
      accounts,
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.6.12",
        settings: {
          optimizer: {
            enabled: true,
            runs: 10000000,
          },
        },
      },
    ],
  },
  etherscan: {
    apiKey: {
      mainnet: process.env.MAINNET_ETHERSCAN_API_KEY,
      goerli: process.env.GOERLI_ETHERSCAN_API_KEY,
    },
  },
};
