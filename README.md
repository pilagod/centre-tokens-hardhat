# centre-tokens-hardhat-deployer

Use `hardhat` to deploy contracts in [centre-tokens](https://github.com/centrehq/centre-tokens/tree/master).

## Environment

- Node >= 16

## Setup

```bash
$ git submodule update --init
$ npm install
```

## Deploy

Please first refer to `.env.example` to check required configurations for deployment, then copy it and set values in your local `.env`. Note that `PROXY_ADMIN_ADDRESS` **MUST NOT** be identical to operator address or any other addresses in the configuration, since proxy admin can only call functions on proxy, but not the implementation behind it.

After setup your `.env`, run following commands to deploy:

```bash
$ npm run deploy:v1 -- --network [NETWORK]
```

* `NETWORK` now supports `mainnet`, `goerli` and `sepolia`.
