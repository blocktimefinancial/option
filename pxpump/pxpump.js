// Parts of this file are from yahoo-finance2
// Copyright (c) 2021 by Gadi Cohen and Pilwon Huh. MIT licensed.
// This file is part of pxpump, Copyright (c) 2023 by Block Time Financial, Inc. MIT licensed.
// Path: pxpump/pxpump.js
// Author: Lou Morgan, Mitchell Bringe

const BigNumber = require("bignumber.js");
const yf = require("yahoo-finance2").default;
const util = require("util");
const stellar_sdk = require("stellar-sdk");
const SorobanClient = require("soroban-client");
const xdr = SorobanClient.xdr;
require("dotenv").config();

// These are global variables for testing on FUTURENET
const contractId =
  "cd0ca2f721d91df334b79fb1e043920919ed0c6b09f930af5048a50930fb7f44";
const pk = "GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH";
const secret = "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL";

// These conversion functions are from the soroban-example-dapp project
// and converted from typescript to javascript.
// Thanks Paul and Estaban!
function bigintToBuf(bn) {
  var hex = BigInt(bn).toString(16).replace(/^-/, "");
  if (hex.length % 2) {
    hex = "0" + hex;
  }

  var len = hex.length / 2;
  var u8 = new Uint8Array(len);

  var i = 0;
  var j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  if (bn < BigInt(0)) {
    // Set the top bit
    u8[0] |= 0x80;
  }

  return Buffer.from(u8);
}

function bigNumberFromBytes(signed, ...bytes) {
  let sign = 1;
  if (signed && bytes[0] === 0x80) {
    // top bit is set, negative number.
    sign = -1;
    bytes[0] &= 0x7f;
  }
  let b = BigInt(0);
  for (let byte of bytes) {
    b <<= BigInt(8);
    b |= BigInt(byte);
  }
  return new BigNumber(b.toString()).multipliedBy(sign);
}

function bigNumberToI128(value) {
  const b = BigInt(value.toFixed(0));
  const buf = bigintToBuf(b);
  if (buf.length > 16) {
    throw new Error("BigNumber overflows i128");
  }

  if (value.isNegative()) {
    // Clear the top bit
    buf[0] &= 0x7f;
  }

  // left-pad with zeros up to 16 bytes
  let padded = Buffer.alloc(16);
  buf.copy(padded, padded.length - buf.length);
  //console.debug({ value: value.toString(), padded });

  if (value.isNegative()) {
    // Set the top bit
    padded[0] |= 0x80;
  }

  const hi = new xdr.Uint64(
    bigNumberFromBytes(false, ...padded.slice(4, 8)).toNumber(),
    bigNumberFromBytes(false, ...padded.slice(0, 4)).toNumber()
  );
  const lo = new xdr.Uint64(
    bigNumberFromBytes(false, ...padded.slice(12, 16)).toNumber(),
    bigNumberFromBytes(false, ...padded.slice(8, 12)).toNumber()
  );

  return xdr.ScVal.scvI128(new xdr.Int128Parts({ lo, hi }));
}

function createContractTransaction(sourceAccount, contractId, method, ...args) {
  let myArgs = args || [];
  const contract = new SorobanClient.Contract(contractId);

  return new SorobanClient.TransactionBuilder(sourceAccount, {
    fee: 100,
    networkPassphrase: SorobanClient.Networks.FUTURENET,
  })
    .addOperation(contract.call(method, ...myArgs))
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();
}

async function invokeContract(params) {
  let body = params.body;

  // Load the account
  let source = await server.getAccount(body.publicKey);

  // Create a transaction to call the contract
  let tx = createContractTransaction(
    source, // Source account
    body.contractId, // Contract ID
    body.method, // Method name
    ...body.params // Method parameters
  );

  tx = await server.prepareTransaction(tx, SorobanClient.Networks.FUTURENET);

  // Log a quick peek at the transaction
  console.log(`After prepareTransaction Tx: ${tx.toXDR()}`);

  // Sign the transaction
  console.log(`Signing with secret: ${body.secret}`);
  tx.sign(SorobanClient.Keypair.fromSecret(body.secret));

  // Log another quick peek at the transaction
  console.log(`Tx: ${tx.toXDR()}`);
  result = await server.sendTransaction(tx);

  // Peek at the results and then wait for the transaction to complete
  console.log("Tx sendTransaction result: ", result);

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

  if (marketState === "PRE") {
    flags |= 1;
    price = quote.preMarketPrice;
    timestamp = quote.preMarketTime.getTime();
  } else if (marketState === "POST") {
    flags |= 2;
    price = quote.regularMarketPreviousClose;
    timestamp = quote.regularMarketTime.getTime();
  } else if (marketState === "REGULAR") {
    flags |= 4;
    price = quote.regularMarketPrice;
    timestamp = quote.regularMarketTime.getTime();
  }

  // from the quote.  We'll just stringify the quote for now.
  let symbolCode = bigNumberToI128(new BigNumber(1));

  // We know that Soroban VM doesn't support floating point numbers, so we'll
  // convert numbers to i128 values with 7 decimal places of precision.
  price = bigNumberToI128(
    new BigNumber(price * 10000000)
  );

  // Dates are also not supported, so we'll convert them to timestamps in
  // the same format as Soroban VM timestamps.
  timestamp = bigNumberToI128(new BigNumber(timestamp));

  //Flags are a bit field, so we'll just set the third bit
  flags = bigNumberToI128(new BigNumber(4));

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
  console.log(`Converted quote: ${toSorobanArgs(quote)}`);

  return await invokeContract({
    body: {
      publicKey: pk,
      secret: secret,
      params: toSorobanArgs(quote),
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

  const scDetailsObj = {
    kp,
    sc_address: process.env.SC_ADDRESS,
    sc_func: "update",
    sc_contractId: contractId,
    sc_contract: new SorobanClient.Contract(process.env.SC_CONTRACTID),
  };

  setInterval(async () => await timerFunc(scDetailsObj), 60000);
}

main();
