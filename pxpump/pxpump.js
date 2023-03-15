// Parts of this file are from yahoo-finance2
// Copyright (c) 2021 by Gadi Cohen and Pilwon Huh. MIT licensed.
// This file is part of pxpump, Copyright (c) 2023 by Block Time Financial, Inc. MIT licensed.
// Path: pxpump/pxpump.js
// Author: Lou Morgan, Mitchell Bringe

const yf = require("yahoo-finance2").default;
const stellar_sdk = require("stellar-sdk");
require("dotenv").config();

// Get the latest quote from yahoo finance
// Do NOT use in production!!!
// This is just for testing
async function getQuote(symbol) {
  const quote = await yf.quote(symbol);
  return quote;
}

// Update the smart contract with the latest quote
// Create the transaction to update the smart contract
async function updateSmartContract(scDetailsObj, quote) {
  
}

// Update the smart contract with the latest quote
async function timerFunc(scDetailsObj){
    const quote = await getQuote("SPY");
    console.log(quote);
    const response = await updateSmartContract(scDetailsObj, quote);
}

// Call the timerFunc every minute to update the smart contract
// with the latest quote
async function main() {
    kp = new stellar_sdk.Keypair.fromSecret(process.env.SECRET_KEY);
    const scDetailsObj = {
        kp,
        sc_address: process.env.SC_ADDRESS,
        sc_func: process.env.SC_FUNC,
    };

    setInterval(async (scDetailsObj) => {
        await timerFunc(scDetailsObj);
    }, 60000);
}

main();