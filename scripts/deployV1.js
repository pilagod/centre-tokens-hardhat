const { ethers, network } = require("hardhat");
const prompts = require("prompts");
const { promptGasPrice, verifyContract } = require("./utils");

const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

async function main() {
  const [operator] = await ethers.getSigners();
  const {
    TOKEN_NAME,
    TOKEN_SYMBOL,
    TOKEN_CURRENCY,
    TOKEN_DECIMALS,
    PROXY_ADMIN_ADDRESS,
    OWNER_ADDRESS,
    MASTERMINTER_ADDRESS,
    PAUSER_ADDRESS,
    BLACKLISTER_ADDRESS,
  } = process.env;

  console.log(`Network:        ${network.name}`);
  console.log(`Deployer:       ${operator.address}`);
  console.log(`Deployer Nonce: ${await operator.getTransactionCount()}`);
  console.log(`Token Name:     ${TOKEN_NAME}`);
  console.log(`Token Symbol:   ${TOKEN_SYMBOL}`);
  console.log(`Token Currency: ${TOKEN_CURRENCY}`);
  console.log(`Token Decimals: ${TOKEN_DECIMALS}`);
  console.log(`Proxy Admin:    ${PROXY_ADMIN_ADDRESS}`);
  console.log(`Owner:          ${OWNER_ADDRESS}`);
  console.log(`Master Minter:  ${MASTERMINTER_ADDRESS}`);
  console.log(`Pauser:         ${PAUSER_ADDRESS}`);
  console.log(`Blacklister:    ${BLACKLISTER_ADDRESS}`);

  const { isInfoCorrect } = await prompts(
    {
      type: "confirm",
      name: "isInfoCorrect",
      message: "Is the information correct?",
    },
    {
      onCancel: () => process.exit(0),
    }
  );
  if (!isInfoCorrect) {
    process.exit(0);
    return;
  }

  const FiatTokenV1Factory = await ethers.getContractFactory("FiatTokenV1");

  console.log("Deploying implementation contract...");
  const fiatTokenV1 = await FiatTokenV1Factory.connect(operator).deploy({
    gasPrice: await promptGasPrice(),
  });
  await fiatTokenV1.deployed();
  console.log("Deployed implementation contract at", fiatTokenV1.address);

  console.log("Initializing implementation contract with dummy values...");
  const initImplTx = await fiatTokenV1
    .connect(operator)
    .initialize(
      "",
      "",
      "",
      0,
      THROWAWAY_ADDRESS,
      THROWAWAY_ADDRESS,
      THROWAWAY_ADDRESS,
      THROWAWAY_ADDRESS,
      {
        gasPrice: promptGasPrice(),
      }
    );
  console.log(`Tx: ${initImplTx.hash}`);
  await initImplTx.wait();
  console.log(`Initialized implementation contract`);

  const FiatTokenProxyFactory = await ethers.getContractFactory(
    "FiatTokenProxy"
  );
  console.log("Deploying proxy contract...");
  const fiatTokenProxy = await FiatTokenProxyFactory.connect(operator).deploy(
    fiatTokenV1.address,
    {
      gasPrice: promptGasPrice(),
    }
  );
  await fiatTokenProxy.deployed();
  // await deployer.deploy(FiatTokenProxy, FiatTokenV1.address);
  // const fiatTokenProxy = await FiatTokenProxy.deployed();
  console.log("Deployed proxy contract at", fiatTokenProxy.address);

  console.log(`Reassigning proxy contract admin to ${PROXY_ADMIN_ADDRESS}...`);
  // need to change admin first, or the call to initialize won't work
  // since admin can only call methods in the proxy, and not forwarded methods
  const changeAdminTx = await fiatTokenProxy
    .connect(operator)
    .changeAdmin(PROXY_ADMIN_ADDRESS, {
      gasPrice: promptGasPrice(),
    });
  console.log(`Tx: ${changeAdminTx.hash}`);
  await changeAdminTx.wait();
  console.log(`Reassigned proxy contract admin to ${PROXY_ADMIN_ADDRESS}`);

  console.log("Initializing proxy contract...");

  const fiatTokenV1Proxy = await FiatTokenV1Factory.attach(
    fiatTokenProxy.address
  );
  // Pretend that the proxy address is a FiatTokenV1 - this is fine because the
  // proxy will forward all the calls to the FiatTokenV1 impl
  const initTx = await fiatTokenV1Proxy
    .connect(operator)
    .initialize(
      TOKEN_NAME,
      TOKEN_SYMBOL,
      TOKEN_CURRENCY,
      TOKEN_DECIMALS,
      MASTERMINTER_ADDRESS,
      PAUSER_ADDRESS,
      BLACKLISTER_ADDRESS,
      OWNER_ADDRESS,
      {
        gasPrice: promptGasPrice(),
      }
    );
  console.log(`Tx: ${initTx.hash}`);
  await initTx.wait();
  // const proxyAsV1 = await FiatTokenV1.at(FiatTokenProxy.address);
  // await proxyAsV1.initialize(
  //   tokenName,
  //   tokenSymbol,
  //   tokenCurrency,
  //   tokenDecimals,
  //   masterMinterAddress,
  //   pauserAddress,
  //   blacklisterAddress,
  //   ownerAddress
  // );
  console.log("Initialized proxy contract");

  await verifyContract(
    "centre-tokens/contracts/v1/FiatTokenV1.sol:FiatTokenV1",
    fiatTokenV1.address,
    []
  );
  await verifyContract(
    "centre-tokens/contracts/v1/FiatTokenProxy.sol:FiatTokenProxy",
    fiatTokenProxy.address,
    [fiatTokenV1.address]
  );

  // const erc20Factory = await ethers.getContractFactory("ERC20Mintable");
  // const hongBaoToken = await erc20Factory
  //   .connect(operator)
  //   .deploy("HongBao Token", "HBT");
  // await hongBaoToken.deployed();

  // console.log(
  //   `HongBao token is successfully deployed at ${hongBaoToken.address}`
  // );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

//
// const fs = require("fs");
// const path = require("path");
// const some = require("lodash/some");

// const FiatTokenV1 = artifacts.require("FiatTokenV1");
// const FiatTokenProxy = artifacts.require("FiatTokenProxy");

// const THROWAWAY_ADDRESS = "0x0000000000000000000000000000000000000001";

// let proxyAdminAddress = "";
// let ownerAddress = "";
// let masterMinterAddress = "";
// let pauserAddress = "";
// let blacklisterAddress = "";

// // Read config file if it exists
// if (fs.existsSync(path.join(__dirname, "..", "config.js"))) {
//   ({
//     PROXY_ADMIN_ADDRESS: proxyAdminAddress,
//     OWNER_ADDRESS: ownerAddress,
//     MASTERMINTER_ADDRESS: masterMinterAddress,
//     PAUSER_ADDRESS: pauserAddress,
//     BLACKLISTER_ADDRESS: blacklisterAddress,
//   } = require("../config.js"));
// }

// module.exports = async (deployer, network) => {
//   if (some(["development", "coverage"], (v) => network.includes(v))) {
//     // DO NOT USE THESE ADDRESSES IN PRODUCTION - these are the deterministic
//     // addresses from ganache, so the private keys are well known and match the
//     // values we use in the tests
//     proxyAdminAddress = "0x2F560290FEF1B3Ada194b6aA9c40aa71f8e95598";
//     ownerAddress = "0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d";
//     masterMinterAddress = "0x3E5e9111Ae8eB78Fe1CC3bb8915d5D461F3Ef9A9";
//     pauserAddress = "0xACa94ef8bD5ffEE41947b4585a84BdA5a3d3DA6E";
//     blacklisterAddress = "0xd03ea8624C8C5987235048901fB614fDcA89b117";
//   }

//   console.log(`Proxy Admin:   ${proxyAdminAddress}`);
//   console.log(`Owner:         ${ownerAddress}`);
//   console.log(`Master Minter: ${masterMinterAddress}`);
//   console.log(`Pauser:        ${pauserAddress}`);
//   console.log(`Blacklister:   ${blacklisterAddress}`);

//   if (
//     !proxyAdminAddress ||
//     !ownerAddress ||
//     !masterMinterAddress ||
//     !pauserAddress ||
//     !blacklisterAddress
//   ) {
//     throw new Error(
//       "PROXY_ADMIN_ADDRESS, OWNER_ADDRESS, MASTERMINTER_ADDRESS, PAUSER_ADDRESS, and BLACKLISTER_ADDRESS must be provided in config.js"
//     );
//   }

//   console.log("Deploying implementation contract...");
//   await deployer.deploy(FiatTokenV1);
//   const fiatTokenV1 = await FiatTokenV1.deployed();
//   console.log("Deployed implementation contract at", FiatTokenV1.address);

//   console.log("Initializing implementation contract with dummy values...");
//   await fiatTokenV1.initialize(
//     "",
//     "",
//     "",
//     0,
//     THROWAWAY_ADDRESS,
//     THROWAWAY_ADDRESS,
//     THROWAWAY_ADDRESS,
//     THROWAWAY_ADDRESS
//   );

//   console.log("Deploying proxy contract...");
//   await deployer.deploy(FiatTokenProxy, FiatTokenV1.address);
//   const fiatTokenProxy = await FiatTokenProxy.deployed();
//   console.log("Deployed proxy contract at", FiatTokenProxy.address);

//   console.log("Reassigning proxy contract admin...");
//   // need to change admin first, or the call to initialize won't work
//   // since admin can only call methods in the proxy, and not forwarded methods
//   await fiatTokenProxy.changeAdmin(proxyAdminAddress);

//   console.log("Initializing proxy contract...");
//   // Pretend that the proxy address is a FiatTokenV1 - this is fine because the
//   // proxy will forward all the calls to the FiatTokenV1 impl
//   const proxyAsV1 = await FiatTokenV1.at(FiatTokenProxy.address);
//   await proxyAsV1.initialize(
//     "USD//C",
//     "USDC",
//     "USD",
//     6,
//     masterMinterAddress,
//     pauserAddress,
//     blacklisterAddress,
//     ownerAddress
//   );
// };
