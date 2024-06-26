// This script deploys the contracts required both for production and
// for testing of the contracts required for the `withdrawal-helpers` library

import * as hardhat from "hardhat";
import "@nomiclabs/hardhat-ethers";
import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { web3Provider } from "./utils";

const testConfigPath = path.join(process.env.MICRO_HOME as string, "etc/test_config/constant");
const ethTestConfig = JSON.parse(fs.readFileSync(`${testConfigPath}/eth.json`, { encoding: "utf-8" }));

async function main() {
  try {
    if (!["test", "localhost"].includes(process.env.CHAIN_ETH_NETWORK)) {
      console.error("This deploy script is only for localhost-test network");
      process.exit(1);
    }

    const provider = web3Provider();
    provider.pollingInterval = 10;

    const deployWallet = ethers.Wallet.fromMnemonic(ethTestConfig.test_mnemonic, "m/44'/60'/0'/0/0").connect(provider);
    const multicallFactory = await hardhat.ethers.getContractFactory("Multicall", deployWallet);
    const multicallContract = await multicallFactory.deploy();

    const revertReceiveFactory = await hardhat.ethers.getContractFactory("RevertReceiveAccount", deployWallet);
    const revertReceiveAccount = await revertReceiveFactory.deploy();

    const outConfig = {
      multicall_address: multicallContract.address,
      revert_receive_address: revertReceiveAccount.address,
    };
    const outConfigPath = path.join(process.env.MICRO_HOME, "etc/test_config/volatile/withdrawal-helpers.json");
    fs.writeFileSync(outConfigPath, JSON.stringify(outConfig), { encoding: "utf-8" });
    process.exit(0);
  } catch (err) {
    console.log(`Error: ${err}`);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err.message || err);
    process.exit(1);
  });
