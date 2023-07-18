const { execSync } = require("child_process");
const { network } = require("hardhat");
const prompts = require("prompts");

module.exports = {
  promptGasPrice: async () => {
    const gwei = ethers.utils.parseUnits("1", "gwei");

    const initialGasPrice = await ethers.provider.getGasPrice();
    const initialGasPriceInGwei = initialGasPrice.div(gwei);

    if (initialGasPriceInGwei.eq(0)) {
      const { gasPrice } = await prompts(
        {
          type: "number",
          name: "gasPrice",
          message: `Set gas price (estimated: ${initialGasPrice} wei):`,
        },
        {
          onCancel: () => process.exit(0),
        }
      );
      return gasPrice;
    }

    const { gasPriceInGwei } = await prompts(
      {
        type: "number",
        name: "gasPriceInGwei",
        message: `Set gas price (gwei) (estimated: ${initialGasPriceInGwei} gwei):`,
      },
      {
        onCancel: () => process.exit(0),
      }
    );
    return gwei.mul(gasPriceInGwei);
  },

  verifyContract: async (contractPath, contractAddress, ctorArgs) => {
    const cmd = `npx hardhat verify --network ${
      network.name
    } --contract ${contractPath} ${contractAddress} ${ctorArgs.join(" ")}`;

    const { verifyConfirmed } = await prompts(
      {
        type: "confirm",
        name: "verifyConfirmed",
        message: `Verify ${contractPath} on ${network.name} etherscan with command: ${cmd}?`,
      },
      {
        onCancel: () => process.exit(0),
      }
    );

    if (verifyConfirmed) {
      execSync(cmd, { stdio: "inherit" });
    }
  },
};
