const { ethers, network } = require("hardhat");
const prompts = require("prompts");
const {
  THROWAWAY_ADDRESS,
  promptGasPrice,
  verifyContract,
} = require("./utils");

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
  }

  /* Deploy Implementation */

  const FiatTokenV2_1Factory = await ethers.getContractFactory("FiatTokenV2_1");

  console.log("Deploying implementation contract...");
  const fiatTokenV2_1 = await FiatTokenV2_1Factory.connect(operator).deploy({
    gasPrice: await promptGasPrice(),
  });
  await fiatTokenV2_1.deployed();
  console.log("Deployed implementation contract at", fiatTokenV2_1.address);

  /* Initialize Implementation */

  console.log("Initializing implementation contract with dummy values...");

  console.log(`Init v1 impl...`);
  const initV1ImplTx = await fiatTokenV2_1
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
  console.log(`Init v1 impl tx: ${initV1ImplTx.hash}`);
  await initV1ImplTx.wait();

  console.log(`Init v2 impl...`);
  const initV2ImplTx = await fiatTokenV2_1.connect(operator).initializeV2("", {
    gasPrice: promptGasPrice(),
  });
  console.log(`Init v2 impl tx: ${initV2ImplTx.hash}`);
  await initV2ImplTx.wait();

  console.log(`Init v2_1 impl...`);
  const initV2_1ImplTx = await fiatTokenV2_1
    .connect(operator)
    .initializeV2_1(THROWAWAY_ADDRESS, {
      gasPrice: promptGasPrice(),
    });
  console.log(`Init v2_1 impl tx: ${initV2_1ImplTx.hash}`);
  await initV2_1ImplTx.wait();

  console.log(`Initialized implementation contract`);

  /* Deploy Proxy */

  const FiatTokenProxyFactory = await ethers.getContractFactory(
    "FiatTokenProxy"
  );
  console.log("Deploying proxy contract...");
  const fiatTokenProxy = await FiatTokenProxyFactory.connect(operator).deploy(
    fiatTokenV2_1.address,
    {
      gasPrice: promptGasPrice(),
    }
  );
  await fiatTokenProxy.deployed();
  console.log("Deployed proxy contract at", fiatTokenProxy.address);

  /* Change Proxy Admin */

  console.log(`Reassigning proxy contract admin to ${PROXY_ADMIN_ADDRESS}...`);
  // need to change admin first, or the call to initialize won't work
  // since admin can only call methods in the proxy, and not forwarded methods
  const changeAdminTx = await fiatTokenProxy
    .connect(operator)
    .changeAdmin(PROXY_ADMIN_ADDRESS, {
      gasPrice: promptGasPrice(),
    });
  console.log(`Change proxy admin tx: ${changeAdminTx.hash}`);
  await changeAdminTx.wait();
  console.log(`Reassigned proxy contract admin to ${PROXY_ADMIN_ADDRESS}`);

  /* Initialize Proxy */

  console.log("Initializing proxy contract...");

  // Pretend that the proxy address is a FiatTokenV2_1
  // This is fine because the proxy will forward all the calls to the FiatTokenV2_1 impl
  const fiatTokenV2_1Proxy = FiatTokenV2_1Factory.attach(
    fiatTokenProxy.address
  );
  console.log(`Init v1...`);
  const initV1Tx = await fiatTokenV2_1Proxy
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
  console.log(`Init v1 tx: ${initV1Tx.hash}`);
  await initV1Tx.wait();

  console.log(`Init v2...`);
  const initV2Tx = await fiatTokenV2_1Proxy
    .connect(operator)
    .initializeV2(TOKEN_NAME, {
      gasPrice: promptGasPrice(),
    });
  console.log(`Init v2 tx: ${initV2Tx.hash}`);
  await initV2Tx.wait();

  console.log(`Init v2_1...`);
  const initV2_1Tx = await fiatTokenV2_1Proxy
    .connect(operator)
    .initializeV2_1(operator.address, {
      gasPrice: promptGasPrice(),
    });
  console.log(`Init v2_1 tx: ${initV2_1Tx.hash}`);
  await initV2_1Tx.wait();

  console.log("Initialized proxy contract");

  /* Verify Implementation and Proxy */

  await verifyContract(
    "centre-tokens/contracts/v2/FiatTokenV2_1.sol:FiatTokenV2_1",
    fiatTokenV2_1.address,
    []
  );
  await verifyContract(
    "centre-tokens/contracts/v1/FiatTokenProxy.sol:FiatTokenProxy",
    fiatTokenProxy.address,
    [fiatTokenV2_1.address]
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
