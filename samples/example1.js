const BigNumber = require("bignumber.js");
const axios = require("axios");
const SorobanClient = require("soroban-client");
const xdr = SorobanClient.xdr;

const server = new SorobanClient.Server(
  "https://rpc-futurenet.stellar.org:443"
);

// These conversion functions are from the soroban-example-dapp project
// and converted from typescript to javascript.
// Thanks Paul and Estaban!

// bn: bigint
// returns: Buffer
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

function toScvSymbol(value) {
  try {
    value = value.toString();
  } catch (e) {
    throw new Error("Invalid value for scvSymbol");
  }
  if (value.length > 32) {
    throw new Error("scvSymbol value too long, max 32 bytes");
  }
  return xdr.ScVal.scvSymbol(value);
}

function toScvU32(value) {
  let _v1 = BigNumber(value);
  if (_v1.isNaN()) {
    throw new Error("Invalid value for scvU32");
  }
  _v1 = _v1.toFixed(0);
  if (_v1 > 4294967295) {
    throw new Error("scvU32 value too large, max 4294967295");
  }
  return xdr.ScVal.scvU32(value);
}
function toScvU64(value) {
  let _v1 = BigNumber(value);
  if (_v1.isNaN()) {
    throw new Error("Invalid value for scvU64");
  }
  _v1 = _v1.toFixed(0);
  if (_v1 > BigNumber(18446744073709551615n)) {
    throw new Error("scvU64 value too large, max 18446744073709551615");
  }
  return xdr.ScVal.scvU64(new xdr.Uint64(value, value));
}

function toSvcAddress(address) {
  // TODO: validate address
  return new SorobanClient.Address(address).toScVal();
}

// value: BigNumber
// returns: SorobanClient.xdr.ScVal
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

async function getHealth() {
  const url = `https://rpc-futurenet.stellar.org:443`;
  const response = await axios.post(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "getHealth",
  });

  return response.data;
}

async function simulateTransaction(tx) {
  const url = `https://rpc-futurenet.stellar.org:443`;
  const response = await axios.post(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "simulateTransaction",
    params: {
      transaction: tx,
    },
  });
  console.dir(response);
  return response.data;
}

async function sendTransaction(tx) {
  const url = `https://rpc-futurenet.stellar.org:443`;
  const response = await axios.post(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "sendTransaction",
    params: {
      transaction: tx,
    },
  });
  //console.dir(response);
  return response.data;
}

async function getTransactionStatus(hash) {
  return await getTransaction(hash);
}

async function getTransaction(hash) {
  const url = `https://rpc-futurenet.stellar.org:443`;
  const response = await axios.post(url, {
    jsonrpc: "2.0",
    id: 2,
    method: "getTransaction",
    params: {
      hash: hash,
    },
  });
  //console.dir(response);
  return response.data;
}

async function loadAccount(pk) {
  return await server.getAccount(pk);
}

function getLedgerKeyAccount(address) {
  // We can use the `StrKey` library here to decode the address into the public
  // key.
  const publicKey = SorobanClient.StrKey.decodeEd25519PublicKey(address);

  const ledgerKey = xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({
      accountId: xdr.PublicKey.publicKeyTypeEd25519(publicKey),
    })
  );
  return ledgerKey.toXDR("base64");
}

// New way of loading an account without using the soroban client
async function loadAccount1(accountId) {
  const ledgerKey = getLedgerKeyAccount(accountId);
  const url = `https://rpc-futurenet.stellar.org:443`;
  const response = await axios.post(url, {
    jsonrpc: "2.0",
    id: 1,
    method: "getLedgerEntry",
    params: {
      key: ledgerKey,
    },
  });

  if (
    response &&
    response.data &&
    response.data.result &&
    response.data.result.xdr
  ) {
    return {
      _accountId: SorobanClient.StrKey.encodeEd25519PublicKey(
        xdr.LedgerEntryData.fromXDR(response.data.result.xdr, "base64")
          .account()
          .accountId()
          .ed25519()
      ),
      //   account_id: SorobanClient.StrKey.encodeEd25519PublicKey(
      //     xdr.LedgerEntryData.fromXDR(response.data.result.xdr, "base64")
      //       .account()
      //       .accountId()
      //       .ed25519()
      //   ),
      sequence: new BigNumber(
        xdr.LedgerEntryData.fromXDR(response.data.result.xdr, "base64")
          .account()
          .seqNum()
      ).toString(),
      //   sequenceNumber: new BigNumber(
      //     xdr.LedgerEntryData.fromXDR(response.data.result.xdr, "base64")
      //       .account()
      //       .seqNum()
      //   ),
      //   subentry_count: xdr.LedgerEntryData.fromXDR(
      //     response.data.result.xdr,
      //     "base64"
      //   )
      //     .account()
      //     .numSubEntries()
      //     .toString(),
      //   home_domain: xdr.LedgerEntryData.fromXDR(
      //     response.data.result.xdr,
      //     "base64"
      //   )
      //     .account()
      //     .homeDomain()
      //     .toString(),
      //   thresholds: xdr.LedgerEntryData.fromXDR(
      //     response.data.result.xdr,
      //     "base64"
      //   )
      //     .account()
      //     .thresholds(),

      //   flags: xdr.LedgerEntryData.fromXDR(response.data.result.xdr, "base64")
      //     .account()
      //     .flags(),

      //   balance: xdr.LedgerEntryData.fromXDR(response.data.result.xdr, "base64")
      //     .account()
      //     .balance()
      //     .toString(),
    };
  }

  return {};
}

function createContractTransaction(sourceAccount, contractId, method, ...args) {
  let myArgs = args || [];
  const contract = new SorobanClient.Contract(contractId);
  //console.log(JSON.stringify(contract.call(method), null, 2));

  return new SorobanClient.TransactionBuilder(sourceAccount, {
    fee: 100,
    networkPassphrase: SorobanClient.Networks.FUTURENET,
  })
    .addOperation(contract.call(method, ...myArgs))
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();
}

// A demo smart contract that takes an i128 as a parameter and returns it
const contractIdold =
  "11c257392f779f95a3ea9603b748d60be2296c23800824f53c7638120b39daba";

const contractIdolder =
  "fe923237f6fac282a06f9b756d488d9fa312b990a705dfa9388ec35479375598";

  const contractId = "cd0ca2f721d91df334b79fb1e043920919ed0c6b09f930af5048a50930fb7f44";
  
async function main() {
  // Double check we have good connectivity to the network
  console.dir(await getHealth());

  // Load the account
  let source = await loadAccount(
    "GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH"
  );

  // Create a transaction to call the contract
  let tx = createContractTransaction(
    source, // Source account
    contractId, // Contract ID
    "retrieve", // Method name
    // bigNumberToI128(new BigNumber(8675309)),
    // bigNumberToI128(new BigNumber(5551212)),
    // bigNumberToI128(new BigNumber(104)),
    // bigNumberToI128(new BigNumber(32))
    // Method arguments
  );

  tx = await server.prepareTransaction(tx, SorobanClient.Networks.FUTURENET);

  // Sign the transaction
  tx.sign(
    SorobanClient.Keypair.fromSecret(
      "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL"
    )
  );

  result = await sendTransaction(tx.toXDR());

  console.log("Tx sendTransaction result: ", result.result);
  const hash = result.result.hash;
  let status = result.result.status;
  let timeout = 0;
  let maxTimeout = 30000;
  do {
    await sleep(2000);
    timeout += 1000;
    console.log(`Looking for Tx status: ${hash} after ${timeout} ms...`);
    result = await getTxStatus(hash);
    console.dir(result);
    status = result.result.status;
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
}

async function getTxStatus(hash) {
  const result = await getTransaction(hash);
  //console.dir(result);
  return result;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//console.dir(toScvSymbol("2.0"));
main();
