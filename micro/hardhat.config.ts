import "@zkamoeba/hardhat-micro-solc";
import "@zkamoeba/hardhat-micro-verify";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-solpp";
import "hardhat-typechain";

// If no network is specified, use the default config
if (!process.env.CHAIN_ETH_NETWORK) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
}

export default {
  zksolc: {
    version: "1.3.14",
    compilerSource: "binary",
    settings: {
      isSystem: true,
    },
  },
  solidity: {
    version: "0.8.20",
  },
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      // micro-test-node default url
      url: "http://127.0.0.1:8011",
      ethNetwork: null,
      micro: true,
    },
    microTestnet: {
      url: "https://micro2-testnet.micro.dev",
      ethNetwork: "goerli",
      micro: true,
      // contract verification endpoint
      verifyURL: "https://micro2-testnet-explorer.micro.dev/contract_verification",
    },
    microMainnet: {
      url: "https://mainnet.era.micro.io",
      ethNetwork: "mainnet",
      micro: true,
      // contract verification endpoint
      verifyURL: "https://micro2-mainnet-explorer.micro.io/contract_verification",
    },
  },
};
