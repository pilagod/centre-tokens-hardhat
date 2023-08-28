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

  const fiatTokenV1Proxy = FiatTokenV1Factory.attach(fiatTokenProxy.address);
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
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
