import { Command } from "commander";
import { ethers, Wallet } from "ethers";
import { Deployer } from "../src.ts/deploy";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { web3Provider, getNumberFromEnv, REQUIRED_L2_GAS_PRICE_PER_PUBDATA } from "./utils";

import * as fs from "fs";
import * as path from "path";

const provider = web3Provider();
const testConfigPath = path.join(process.env.MICRO_HOME as string, `etc/test_config/constant`);
const ethTestConfig = JSON.parse(fs.readFileSync(`${testConfigPath}/eth.json`, { encoding: "utf-8" }));

const systemContractArtifactsPath = path.join(process.env.MICRO_HOME as string, "etc/system-contracts/artifacts-zk/");

const systemCrtifactsPath = path.join(systemContractArtifactsPath, "cache-zk/solpp-generated-contracts/");

const contractArtifactsPath = path.join(process.env.MICRO_HOME as string, "contracts/ethereum/artifacts/");

const tokenArtifactsPath = path.join(contractArtifactsPath, "cache/solpp-generated-contracts/micro");

const l2TokenAdress = process.env.CONTRACTS_L2_ZKAT_ADDR;

function readInterface(path: string, fileName: string) {
  const abi = JSON.parse(fs.readFileSync(`${path}/${fileName}.sol/${fileName}.json`, { encoding: "utf-8" })).abi;
  return new ethers.utils.Interface(abi);
}

const DEPOSIT_INTERFACE = readInterface(systemCrtifactsPath, "Deposit");
const BATCH_EVENT_INTERFACE = readInterface(systemCrtifactsPath, "BatchEvent");
const WHITE_LIST_INTERFACE = readInterface(systemCrtifactsPath, "WhiteList");
const BATCH_REWARD_INTERFACE = readInterface(systemCrtifactsPath, "BatchReward");
const RECEVING_ADDRESS_INTERFACE = readInterface(systemCrtifactsPath, "RecevingAddress");
const ASSIGNMENT_INTERFACE = readInterface(systemCrtifactsPath, "Assignment");
const DAO_INTERFACE = readInterface(systemCrtifactsPath, "Dao");
const ZKA_INTERFACE = readInterface(tokenArtifactsPath, "ZKAmoebaToken");

const DEPOSIT_ADDRESS = "0x0000000000000000000000000000000000008100";
const BATCH_EVENT_ADDRESS = "0x0000000000000000000000000000000000008102";
const DAO_ADDRESS = "0x0000000000000000000000000000000000008103";
const WHITE_LIST_ADDRESS = "0x0000000000000000000000000000000000008105";
const BATCH_REWARD_ADDRESS = "0x0000000000000000000000000000000000008106";
const RECEVING_ADDRESS = "0x0000000000000000000000000000000000008107";
const ASSIGNMENT_ADDRESS = "0x0000000000000000000000000000000000008108";

async function main() {
  const program = new Command();

  program.version("0.1.0").name("initialize-system-contracts");

  program
    .option("--private-key <private-key>")
    .option("--gas-price <gas-price>")
    .option("--owner <owner>")
    .option("--token <token>")
    .option("--pakage-cycle <pakage-cycle>")
    .option("--min-deposit-amount <min-deposit-amount>")
    .option("--release-cycle <release-cycle>")
    .option("--penalize-ratio <penalize-ratio>")
    .option("--confiscation-vote-ratio <confiscation-vote-ratio>")
    .option("--confiscation-to-node-percent <confiscation-to-node-percent>")
    .option("--proof-time-target <proof-time-target>")
    .option("--adjustment-quotient <adjustment-quotient>")
    .action(async (cmd) => {
      const deployWallet = cmd.privateKey
        ? new Wallet(cmd.privateKey, provider)
        : Wallet.fromMnemonic(
            process.env.MNEMONIC ? process.env.MNEMONIC : ethTestConfig.mnemonic,
            "m/44'/60'/0'/0/0"
          ).connect(provider);
      console.log(`Using deployer wallet: ${deployWallet.address}`);

      const gasPrice = cmd.gasPrice ? parseUnits(cmd.gasPrice, "gwei") : await provider.getGasPrice();
      console.log(`Using gas price: ${formatUnits(gasPrice, "gwei")} gwei`);

      const deployer = new Deployer({
        deployWallet,
        verbose: true,
      });

      const micro = deployer.microContract(deployWallet);
      const priorityTxMaxGasLimit = getNumberFromEnv("CONTRACTS_PRIORITY_TX_MAX_GAS_LIMIT");

      const owner = cmd.owner ? cmd.owner : deployWallet.address;
      const admin = cmd.admin ? cmd.owner : deployWallet.address;
      const token = cmd.token ? cmd.token : l2TokenAdress;

      const proofTimeTarget = cmd.proofTimeTarget ? parseInt(cmd.proofTimeTarget) : 150;
      const adjustmentQuotient = cmd.adjustmentQuotient ? parseInt(cmd.adjustmentQuotient) : 100;

      const payToServerTime = cmd.payToServerTime
        ? parseInt(cmd.payToServerTime)
        : Math.round(Date.now() / 1000) + 60 * 24 * 60 * 60;
      const batchRewardRate = cmd.batchRewardRate ? parseUnits(cmd.batchRewardRate, "ether") : parseUnits("3", "ether");
      const proverBaseReward = cmd.proverBaseReward
        ? parseUnits(cmd.proverBaseReward, "ether")
        : parseUnits("1.5", "ether");
      const proverProofRewardRate = cmd.proverProofRewardRate
        ? parseUnits(cmd.proverProofRewardRate, "ether")
        : parseUnits("1.5", "ether");

      const requiredValueToPublishBytecodes = await micro.l2TransactionBaseCost(
        gasPrice.div(3),
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA
      );

      // initialize Deposit
      const depositInitializationParams = DEPOSIT_INTERFACE.encodeFunctionData("initialize", [owner, admin]);

      const depositInitializaTx = await micro.requestL2Transaction(
        DEPOSIT_ADDRESS,
        0,
        depositInitializationParams,
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        [],
        deployWallet.address,
        { gasPrice, value: requiredValueToPublishBytecodes }
      );
      const depositInitializaRecepit = await depositInitializaTx.wait();
      console.log(`Deposit initialized, gasUsed: ${depositInitializaRecepit.gasUsed.toString()}`);

      // initialize WhiteList
      const whiteListInitializationParams = WHITE_LIST_INTERFACE.encodeFunctionData("initialize", [owner]);
      const whiteListTx = await micro.requestL2Transaction(
        WHITE_LIST_ADDRESS,
        0,
        whiteListInitializationParams,
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        [],
        deployWallet.address,
        { gasPrice, value: requiredValueToPublishBytecodes }
      );
      const whiteListReceipt = await whiteListTx.wait();

      console.log(`WhiteList initialized, gasUsed: ${whiteListReceipt.gasUsed.toString()}`);

      // initialize BatchReward
      const batchRewardInitializationParams = BATCH_REWARD_INTERFACE.encodeFunctionData("initialize", [
        owner,
        token,
        payToServerTime,
        batchRewardRate,
        proverBaseReward,
        proverProofRewardRate,
      ]);

      const batchRewardTx = await micro.requestL2Transaction(
        BATCH_REWARD_ADDRESS,
        0,
        batchRewardInitializationParams,
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        [],
        deployWallet.address,
        { gasPrice, value: requiredValueToPublishBytecodes }
      );
      const batchRewardReceipt = await batchRewardTx.wait();

      console.log(`BatchReward initialized, gasUsed: ${batchRewardReceipt.gasUsed.toString()}`);

      // initialize Dao
      const daoInitializationParams = DAO_INTERFACE.encodeFunctionData("initialize", [owner]);

      const daoTx = await micro.requestL2Transaction(
        DAO_ADDRESS,
        0,
        daoInitializationParams,
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        [],
        deployWallet.address,
        { gasPrice, value: requiredValueToPublishBytecodes }
      );
      const daoReceipt = await daoTx.wait();

      console.log(`Dao initialized, gasUsed: ${daoReceipt.gasUsed.toString()}`);

      // initialize RecevingAddress
      const recevingAddressInitializationParams = RECEVING_ADDRESS_INTERFACE.encodeFunctionData("initialize", [owner]);

      const recevingAddressTx = await micro.requestL2Transaction(
        RECEVING_ADDRESS,
        0,
        recevingAddressInitializationParams,
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        [],
        deployWallet.address,
        { gasPrice, value: requiredValueToPublishBytecodes }
      );
      const recevingAddressReceipt = await recevingAddressTx.wait();

      console.log(`RecevingAddress initialized, gasUsed: ${recevingAddressReceipt.gasUsed.toString()}`);

      // initialize Assignment
      const assignmentInitializationParams = ASSIGNMENT_INTERFACE.encodeFunctionData("initialize", [owner]);

      const assignmentTx = await micro.requestL2Transaction(
        ASSIGNMENT_ADDRESS,
        0,
        assignmentInitializationParams,
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        [],
        deployWallet.address,
        { gasPrice, value: requiredValueToPublishBytecodes }
      );
      const assignmentRecepitReceipt = await assignmentTx.wait();

      console.log(`Assignment initialized, gasUsed: ${assignmentRecepitReceipt.gasUsed.toString()}`);

      // //approve and deposit
      // const depositAmount = parseUnits('1000000', 'ether');
      // const tokenApproveParams = ZKA_INTERFACE.encodeFunctionData('approve', [DEPOSIT_ADDRESS, depositAmount]);

      // const approveTx = await micro.requestL2Transaction(
      //     token,
      //     0,
      //     tokenApproveParams,
      //     priorityTxMaxGasLimit,
      //     REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
      //     [],
      //     deployWallet.address,
      //     { gasPrice, value: requiredValueToPublishBytecodes, gasLimit: 1_000_000_000 }
      // );
      // const approveRecepit = await approveTx.wait();
      // console.log(`Token approve, gasUsed: ${approveRecepit.gasUsed.toString()}`);

      // const depositParams = DEPOSIT_INTERFACE.encodeFunctionData('deposit', [depositAmount]);

      // const depositTx = await micro.requestL2Transaction(
      //     DEPOSIT_ADDRESS,
      //     0,
      //     depositParams,
      //     priorityTxMaxGasLimit,
      //     REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
      //     [],
      //     deployWallet.address,
      //     { gasPrice, value: requiredValueToPublishBytecodes, gasLimit: 1_000_000_000 }
      // );
      // const depositRecepit = await depositTx.wait();
      // console.log(`Deposit deposit, gasUsed: ${depositRecepit.gasUsed.toString()}`);

      //transfer to m/44'/60'/0'/0/2  999000000
      // const receiveAddress = Wallet.fromMnemonic(
      //     process.env.MNEMONIC ? process.env.MNEMONIC : ethTestConfig.mnemonic,
      //     "m/44'/60'/0'/0/2"
      // ).address;

      const transferAmount = parseUnits("999000000", "ether");
      const tokenTransferParams = ZKA_INTERFACE.encodeFunctionData("transfer", [BATCH_REWARD_ADDRESS, transferAmount]);

      const transferTx = await micro.requestL2Transaction(
        token,
        0,
        tokenTransferParams,
        priorityTxMaxGasLimit,
        REQUIRED_L2_GAS_PRICE_PER_PUBDATA,
        [],
        deployWallet.address,
        { gasPrice, value: requiredValueToPublishBytecodes }
      );
      const transferRecepit = await transferTx.wait();
      console.log(`Token transfer, gasUsed: ${transferRecepit.gasUsed.toString()}`);
    });

  await program.parseAsync(process.argv);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
