// Adapted from Paul Bellamy's code at https://github.com/paulbellamy
// and esteblock at npmjs.com/soroban-react
// A complete mishmash of code from various sources.
// This is a work in progress!!!!
// Current as of 4/7/2023

const BigNumber = require("bignumber.js");
const SorobanClient = require("soroban-client");

const remoteServerUrl = "https://rpc-futurenet.stellar.org/";
//const remoteServerUrl = "https://horizon-live.stellar.org:1337/api/v1/jsonrpc";

// There is conflicting documentation on where the RPC endpoint is located.
const localServerUrl = "http://localhost:8000/soroban/rpc";
//const localServerUrl = "http://localhost:8000/api/v1/jsonrpc";
//const localServerUrl = "http://localhost:8000";

// Live as of 4/5/23, seqNum = 44723494453248, lastModfiedLedger = 10413
const pk = "GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH";
const sk = "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL";

// const contractId =
//   "44292d82725308d77189e8325e0b445b60692528f586f223aa1527bece71bc8d";

//   // Second deployment of the same contract, oracle contract
// const cnt2 = "96b3e59528066b73285a6308f2dd8a053238e8e50f246b462a09a698a6def759";

const cnt3 = "f99494aa0392e3da554155208e8e184d6f84eb02444070ea3bf3f2bc1aa96558";
const oracle1 = "fe923237f6fac282a06f9b756d488d9fa312b990a705dfa9388ec35479375598";

const server = new SorobanClient.Server(remoteServerUrl, { allowHttp: true });
let xdr = SorobanClient.xdr;

function getDefaultTxOptions() {
  return {
    server: server,
    allowHttp: true,
    fee: 100,
    networkPassphrase: SorobanClient.Networks.FUTURENET,
    //v1: true,
  };
}

function convertToXdrInt128(lo, hi) {
  return xdr.ScVal.scvObject(
    xdr.ScObject.scoI128(
      new xdr.Int128Parts({
        lo: xdr.Uint64.fromString(lo),
        hi: xdr.Uint64.fromString(hi),
      })
    )
  );
}

function convertToXdrString(str) {
  return xdr.ScVal.scvObject(
    xdr.ScObject.scoString(new xdr.Bytes(Buffer.from(str)))
  );
}

function emptyFootprint() {
  return new xdr.LedgerFootprint({
    readOnly: [],
    readWrite: [],
  });
}

async function loadAccount(accountId, txOptions = {}) {
  if (!txOptions.server) {
    throw new Error("txOptions.server is required");
  }
  return await txOptions.server.getAccount(accountId);
}

// scval: SorobanClient.xdr.ScVal | undefined
// Returns: BigNumber
function scvalToBigNumber(scval) {
  switch (scval?.switch()) {
    case undefined: {
      return BigNumber(0);
    }
    case xdr.ScValType.scvU32(): {
      return BigNumber(scval.u32());
    }
    case xdr.ScValType.scvI32(): {
      return BigNumber(scval.i32());
    }
    case xdr.ScValType.scvU64(): {
      const { high, low } = scval.u64();
      return bigNumberFromBytes(false, high, low);
    }
    case xdr.ScValType.scvI64(): {
      const { high, low } = scval.i64();
      return bigNumberFromBytes(true, high, low);
    }
    case xdr.ScValType.scvU128(): {
      const parts = scval.u128();
      const a = parts.hi();
      const b = parts.lo();
      return bigNumberFromBytes(false, a.high, a.low, b.high, b.low);
    }
    case xdr.ScValType.scvI128(): {
      const parts = scval.i128();
      const a = parts.hi();
      const b = parts.lo();
      return bigNumberFromBytes(true, a.high, a.low, b.high, b.low);
    }
    case xdr.ScValType.scvU256(): {
      return bigNumberFromBytes(false, ...scval.u256());
    }
    case xdr.ScValType.scvI256(): {
      return bigNumberFromBytes(true, ...scval.i256());
    }
    default: {
      throw new Error(
        `Invalid type for scvalToBigNumber: ${scval?.switch().name}`
      );
    }
  }
}
// signed: boolean
// ...bytes: (string | number | bigint)[]
// Returns: BigNumber
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
  return BigNumber(b.toString()).multipliedBy(sign);
}

// value: BigNumber
// Returns: SorobanClient.xdr.ScVal
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
  console.debug({ value: value.toString(), padded });

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

// bn: bigint
// Returns: Buffer
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

// value: SorobanClient.xdr.Uint64
// Returns: number
function xdrUint64ToNumber(value) {
  let b = 0;
  b |= value.high;
  b <<= 8;
  b |= value.low;
  return b;
}

// value: SorobanClient.xdr.ScVal
// Returns: string | undefined
function scvalToString(value) {
  return value.bytes().toString();
}

function getLedgerKeySymbol(contractId, symbolText) {
  const ledgerKey = xdr.LedgerKey.contractData(
    new xdr.LedgerKeyContractData({
      contractId: Buffer.from(contractId, 'hex'),
      key: xdr.ScVal.scvSymbol(symbolText)
    })
  )
  return ledgerKey.toXDR('base64')
}

console.log(getLedgerKeySymbol(
  oracle1,
  '0'));

function createContractTransaction(
  sourceAccount,
  contractId,
  method,
  args = [],
  txOptions = {}
) {
  let myArgs = args || [];
  const contract = new SorobanClient.Contract(contractId);

  return new SorobanClient.TransactionBuilder(sourceAccount, txOptions)
    .addOperation(contract.call(method, ...myArgs))
    .setTimeout(txOptions.timeout || SorobanClient.TimeoutInfinite)
    .build();
}

// Send a transaction to the network and wait for it to be processed.
// Ideally it should have a footprint and must be signed.
// tx: SorobanClient.Transaction
// txOptions: {
//   server: SorobanClient.Server,
//   timeout: number,
// }
// Returns:
async function submitTransaction(tx, txOptions) {
  // Send the transaction to the network.
  console.log(`Sending transaction...w/txOptions:${JSON.stringify(txOptions)}`);
  const response = await txOptions.server.sendTransaction(tx);
  console.log("Transaction sent.", JSON.stringify(response));
  const sleepTime = Math.min(1000, txOptions.timeout);
  console.log(`Waiting for transaction to be processed...`);
  for (let i = 0; i < txOptions.timeout; i += sleepTime) {
    await sleep(sleepTime);
    try {
      const txResponse = await txOptions.server.getTransactionStatus(
        response.id
      );
      console.log(`Transaction status: ${txResponse.status}`);
      switch (txResponse.status) {
        case "success":
          let results = txResponse.results;
          if (!results) {
            // Paul says FIXME at some point.
            return SorobanClient.xdr.ScVal.scvI32(-1);
          }
          if (results.length > 1) {
            throw new Error(`Expected 1 result, got ${results.length}`);
          }
          return SorobanClient.xdr.fromXDR(
            Buffer.from(results[0].xdr, "base64")
          );

        case "pending":
          continue;

        case "error":
          throw txResponse.error;

        default:
          throw new Error(`Unknown transaction status: ${txResponse.status}`);
      }
    } catch (err) {
      if ("code" in err && err.code === 404) {
        // Transaction not found, keep waiting. NoOp
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Transaction ${id} timed out after ${txOptions.timeout}ms`);
}

async function getFootprint(tx, txOptions) {
  return await txOptions.server.prepareTransaction(tx, txOptions.networkPassphrase);
}

function txHashHexStr(tx) {
  return tx.hash().toString("hex");
}

function txToBase64(tx) {
  return tx.toEnvelope().toXDR().toString("base64");
  // or tx.toEnvelope().toXDR("base64");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testLoadAccount() {
  let txOptions = getDefaultTxOptions();

  const result = await loadAccount(pk, txOptions);
  console.dir(result);
}

testLoadAccount();

async function testGateway() {
  
  let txOptions = getDefaultTxOptions();
  console.log(`Set default txOptions: ${JSON.stringify(txOptions,undefined,2)}\n`);
  
  let result;
  // console.log(`Getting health...`);
  // result = await txOptions.server.getHealth();
  // console.log(`getHealth: ${JSON.stringify(result)}\n`);

  // console.log(`Getting ledgerEntry...`);
  // let key = new xdr.LedgerKey("ContractCode");
  // result = await txOptions.server.getLedgerEntry(key);
  // console.log(`getLedgerEntry: ${JSON.stringify(result)}\n`);

  console.log(`Getting events...`);
  result = await txOptions.server.getEvents({startLedger:"25500"});
  console.log(`getEvents: ${JSON.stringify(result,undefined,2)}\n`);

  result = await loadAccount(pk,txOptions);
  console.log(`account: ${JSON.stringify(result,undefined,2)}\n`);
  let account = result;
  // console.log(`Getting a transaction...`);
  // result = await txOptions.server.getTransactionStatus("dfdacec5378a7b0690047fa0aefd461b9dd99940dd2f91a297d32fb3ee789d20");
  // console.log(`getTransactionStatus: ${JSON.stringify(result)}\n`);

  let tx = createContractTransaction(
    account,
    contractId,
    "init",
    [],
    txOptions
  );
  console.log(`tx: ${JSON.stringify(tx,undefined,2)}\n`);
  //console.dir(tx);

  tx.sign(SorobanClient.Keypair.fromSecret(sk));
  //console.log(`tx w/footprint & signature: ${JSON.stringify(tx,undefined,2)}\n`);

  console.log(`prepareTransaction: w/txOptions: ${JSON.stringify(txOptions,undefined,2)}\n`);
  let xdrTx = tx.toXDR("base64");
  console.log(`xdrTx: ${xdrTx}\n`);
  simTx = await txOptions.server.simulateTransaction(xdrTx, txOptions.networkPassphrase);;
  console.log(`tx w/footprint: ${JSON.stringify(simTx,undefined,2)}\n`);
  //console.dir(tx);

}

//testGateway();

async function main() {
  console.log(`Main: ${contractId} ${pk} ${sk}`);

  let txOptions = getDefaultTxOptions();
  console.log(`txOptions: ${JSON.stringify(txOptions)}\n`);
  //console.dir(txOptions);

  const account = await loadAccount(pk, txOptions);
  console.log(`account: ${JSON.stringify(account)}\n`);
  //console.dir(account);

  let tx = createContractTransaction(
    account,
    contractId,
    "init",
    [],
    txOptions
  );
  console.log(`tx: ${JSON.stringify(tx)}\n`);
  //console.dir(tx);

  console.log(`prepareTransaction: w/txOptions: ${JSON.stringify(txOptions)}\n`);
  tx = await txOptions.server.simulateTransaction(tx, txOptions.networkPassphrase);;
  console.log(`tx w/footprint: ${JSON.stringify(tx)}\n`);
  //console.dir(tx);

  tx.sign(SorobanClient.Keypair.fromSecret(sk));
  console.log(`tx w/footprint & signature: ${JSON.stringify(tx)}\n`);

  console.log(`submitting tx w/txOptions: ${JSON.stringify(txOptions)}\n`);
  const response = await submitTransaction(tx, txOptions);
  console.log(`response: ${JSON.stringify(response)}`);
  //console.dir(response);
}

//main();