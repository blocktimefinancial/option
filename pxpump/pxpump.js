// Parts of this file are from yahoo-finance2
// Copyright (c) 2021 by Gadi Cohen and Pilwon Huh. MIT licensed.
// This file is part of pxpump, Copyright (c) 2023 by Block Time Financial, Inc. MIT licensed.
// Path: pxpump/pxpump.js
// Author: Lou Morgan, Mitchell Bringe

const yf = require("yahoo-finance2").default;
const stellar_sdk = require("stellar-sdk");
const SorobanClient = require("soroban-client");
require("dotenv").config();

const server = new SorobanClient.Server(process.env.SOROBAN_SERVER);

// Get the latest quote from yahoo finance
// Do NOT use in production!!!
// This is just for testing
async function getQuote(symbol) {
  const quote = await yf.quote(symbol);
  return quote;
}

function toSorobanArgs(quote) {
  // TODO: Build the arg string for the smart contract
  // from the quote.  We'll just stringify the quote for now.
  return JSON.stringify(quote);
}

// Update the smart contract with the latest quote
// Create the transaction to update the smart contract
async function updateSmartContract(scDetailsObj, quote) {
  // Create the transaction to update the smart contract

  const account = await server.getAccount(kp.publicKey());
  const fee = 100;

  let tx = new stellar_sdk.TransactionBuilder(kp, {
    fee,
    networkPassphrase: SorobanClient.Networks.STANDALONE,
  })
    .addOperation(
      scDetailsObj.sc_contract.call(scDetailsObj.sc_func, toSorobanArgs(quote))
    )
    .setTimeout(60)
    .build();

  // Simulate the transaction to discover the storage footprint, and update the
  // transaction to include it. If you already know the storage footprint you
  // can use `addFootprint` to add it yourself, skipping this step.
  tx = await server.prepareTransaction(tx);

  // Sign the transaction
  tx.sign(kp);

  let response;
  try {
    response = await server.sendTransaction(tx);
  } catch (err) {
    console.log(err);
  }

  return response;
}

// Update the smart contract with the latest quote
// For this example, we'll be using the symbol, "SPY", which
// is the S&P 500 ETF by iShares.  The option contracts on this
// ETF are very liquid and are used for testing.
async function timerFunc(scDetailsObj) {
  const quote = await getQuote("SPY");
  console.log(quote);
  //const response = await updateSmartContract(scDetailsObj, quote);
}

// Call the timerFunc every minute to update the smart contract
// with the latest quote
async function main() {
  
  kp = SorobanClient.Keypair.fromSecret(process.env.SECRET_KEY);
  console.log(`Updating ${process.env.SC_CONTRACTID} using ${kp.publicKey()}`);

  const scDetailsObj = {
    kp,
    sc_address: process.env.SC_ADDRESS,
    sc_func: process.env.SC_FUNC,
    sc_contractId: process.env.SC_CONTRACTID,
    sc_contract: new SorobanClient.Contract(process.env.SC_CONTRACTID),
  };

  setInterval(async (scDetailsObj) => {
    await timerFunc(scDetailsObj);
  }, 60000);
}

main();
