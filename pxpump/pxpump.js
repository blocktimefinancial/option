// Parts of this file are from yahoo-finance2
// Copyright (c) 2021 by Gadi Cohen and Pilwon Huh. MIT licensed.
// This file is part of pxpump, Copyright (c) 2023 by Block Time Financial, Inc. MIT licensed.
// Path: pxpump/pxpump.js
// Author: Lou Morgan, Mitchell Bringe

const BigNumber = require("bignumber.js");
const yf = require("yahoo-finance2").default;
const util = require("util");
const SorobanClient = require("soroban-client");
const xdr = SorobanClient.xdr;
require("dotenv").config();

const ONE_MINUTE_MS = 60 * 1000;
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;

// These are global variables for testing on FUTURENET
// Old 0.7.0 contractId, gone with the wind on futurenet reset
// const contractId =
//   "cd0ca2f721d91df334b79fb1e043920919ed0c6b09f930af5048a50930fb7f44";

// New 0.8.0 contractId for Oracle contract
// const contractId =
//   "b7664664ed4f93e1773448d8959e9bcc1cf213564f1ff6cc832a1793635050f8";
const contractId = "e1f77313773d8e429836c080e5470bdfb28f34f33847827601b0c540ace109bf";

const pk = "GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH";
const secret = "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL";

// Removed conversion functions as these are now part of the js-soroban-client library

function createContractTransaction(networkPassphrase, sourceAccount, contractId, method, ...args) {
  let myArgs = args || [];
  const contract = new SorobanClient.Contract(contractId);

  console.log(
    `Creating contract transaction for ${contractId} ${util.inspect(
      sourceAccount,
      false,
      3
    )}`
  );
  console.log(`Contract: ${util.inspect(contract, false, 3)}`);

  return new SorobanClient.TransactionBuilder(sourceAccount, {
    fee: 100,
    networkPassphrase: networkPassphrase,
  })
    .addOperation(contract.call(method, ...myArgs))
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();
}

async function invokeContract(params) {
  let body = params.body;
  let src = params.publicKey || params.source;
  // Load the account
  let source = await server.getAccount(body.publicKey);

  // Create a transaction to call the contract
  let tx = createContractTransaction(
    source, // Source account
    body.contractId, // Contract ID
    body.method, // Method name
    ...body.params // Method parameters
  );

  // Little peek at the transaction before it's simulated
  console.log(`Tx XDR: ${tx.toXDR()}`);
  console.log(`Simulating transaction for ${body.contractId}`);

  const sim = await server.simulateTransaction(tx);
  console.log(`Sim: ${util.inspect(sim, false, 5)}`);

  console.log(`Preparing transaction for ${body.contractId}`);
  tx = await server.prepareTransaction(tx, SorobanClient.Networks.FUTURENET);


  console.log(`Signing with secret: ${body.secret}`);
  tx.sign(SorobanClient.Keypair.fromSecret(body.secret));

    // Log a quick peek at the transaction after it is signed and before it's sent
    console.log(`After prepareTransaction Tx: ${tx.toXDR()}`);
  let result = await server.sendTransaction(tx);

  // Peek at the results and then wait for the transaction to complete
  console.log("Tx sendTransaction result: ", util.inspect(result));

  const hash = result.hash;
  let status = result.status;
  let timeout = 0;
  let maxTimeout = 30000;
  do {
    await sleep(2000);
    timeout += 1000;
    console.log(`Looking for Tx status: ${hash} after ${timeout} ms...`);
    result = await server.getTransaction(hash);
    console.dir(result);
    status = result.status;
    console.log("Tx status: ", status);
  } while (
    (status.toLowerCase() === "pending" ||
      status.toLowerCase() === "not_found") &&
    timeout < maxTimeout
  );
  console.log(
    `Final Tx status: ${status} after ${timeout} ms, tx ${
      timeout < maxTimeout ? "did not" : "did"
    } timeout`
  );

  // Emit event
  if (status.toLowerCase() === "success") {
    console.log("Tx succeeded");
  } else {
    console.log("Tx failed");
  }

  return result;
}

// Standard sleep function
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const server = new SorobanClient.Server(process.env.FUTURENET_SERVER);

// Helper function to convert floating point numbers to BigNumber values with 7 decimal places of precision.
function convertFloatToInt(obj) {
  let newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      let v = new BigNumber(value * 10000000);
      newObj[key] = v.toFormat(0);
    } else {
      newObj[key] = value;
    }
  }
  return newObj;
}

function convertDatesToTimestamps(obj) {
  let newObj = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Date) {
      const timestamp = Date.parse(value);
      if (!isNaN(timestamp)) {
        newObj[key] = timestamp;
      } else {
        newObj[key] = value;
      }
    } else {
      newObj[key] = value;
    }
  }
  return newObj;
}

// Get the latest quote from yahoo finance
// Do NOT use in production!!!
// This is just for testing
async function getQuote(symbol) {
  const quote = await yf.quote(symbol);
  return quote;
}

function toSorobanArgs(quote) {
  // TODO: Build the arg string for the smart contract

  // TODO: Use a more standard encoding model for types and values

  const marketState = quote.marketState;
  let flags = 0;
  let price = 0;

  switch (marketState) {
    case "PRE":
      flags |= 1;
      price = quote.preMarketPrice;
      timestamp = quote.preMarketTime.getTime();
      break;
    case "POST":
      flags |= 2;
      price = quote.regularMarketPreviousClose;
      timestamp = quote.regularMarketTime.getTime();
      break;
    case "REGULAR":
      flags |= 4;
      price = quote.regularMarketPrice;
      timestamp = quote.regularMarketTime.getTime();
      break;
    case "POSTPOST":
      flags |= 8;
      price = quote.regularMarketPrice;
      timestamp = quote.postMarketTime.getTime();
      break;
    default:
      // Invalid market state
      flags |= 16;
      price = 0.0;
      timestamp = 0;
  }

  console.log(
    `Market state: ${marketState}, flags: ${flags}, price: ${price}, timestamp: ${timestamp}`
  );
  // from the quote.  We'll just stringify the quote for now.
  let symbolCode = bigNumberToI128(new BigNumber(1));
  console.dir(`Symbol code: ${symbolCode}`);

  // We know that Soroban VM doesn't support floating point numbers, so we'll
  // TODO: This actually overflows the scvI128 XDR conversion, so we'll need to
  // wait until js-stellar-base has better conversion support.
  // Moving to 2 decimal places for now.
  // convert numbers to i128 values with 7 decimal places of precision.
  price = bigNumberToI128(new BigNumber(Math.floor(price * 100)));
  console.dir(`Price: ${price}`);
  // Dates are also not supported, so we'll convert them to timestamps in
  // the same format as Soroban VM timestamps.
  const ts = new BigNumber(timestamp);
  console.log(`Timestamp: ${ts}`);

  timestamp = bigNumberToI128(ts);
  console.dir(`Timestamp: ${timestamp}`);

  //Flags are a bit field, so we'll just set the third bit
  flags = bigNumberToI128(new BigNumber(flags));
  console.dir(`Flags: ${flags}`);

  return [symbolCode, price, timestamp, flags];
}

// Update the smart contract with the latest quote
// Create the transaction to update the smart contract
async function updateSmartContract(scDetailsObj, quote) {
  // Create the transaction to update the smart contract

  const account = await server.getAccount(pk);
  console.log(`Account: ${account._accountId} SeqNum: ${account.sequence}`);

  // We don't know what the fees will be, so we'll just use a constant fee
  const fee = 100;

  console.log(`UpdatingSmartContract ${contractId} using ${pk}`);
  const sorobanArgs = toSorobanArgs(quote);
  console.log(`Converted quote: ${util.inspect(sorobanArgs, false, 5)}`);

  return await invokeContract({
    body: {
      publicKey: pk,
      secret: secret,
      params: sorobanArgs,
      contractId: contractId,
      method: "update",
    },
  });
}

// Update the smart contract with the latest quote
// For this example, we'll be using the symbol, "SPY", which
// is the S&P 500 ETF by iShares.  The option contracts on this
// ETF are very liquid and are used for testing.
async function timerFunc(scDetailsObj) {
  const quote = await getQuote("SPY");
  console.log(quote);
  const response = await updateSmartContract(scDetailsObj, quote);
  console.log(`UpdateSmartContract response: ${util.inspect(response)}`);
}

// Call the timerFunc every minute to update the smart contract
// with the latest quote
async function main() {
  kp = SorobanClient.Keypair.fromSecret(secret);
  console.log(`Updating ${contractId} using ${pk}`);

  console.dir(SorobanClient.nativeToScVal("Hi Mitchell", 'Symbol'));

  return;

  const scDetailsObj = {
    kp,
    sc_address: process.env.SC_ADDRESS,
    sc_func: "update",
    sc_contractId: contractId,
    sc_contract: new SorobanClient.Contract(process.env.SC_CONTRACTID),
  };

  setInterval(async () => await timerFunc(scDetailsObj), ONE_MINUTE_MS);
}

main();
