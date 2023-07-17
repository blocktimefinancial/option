// Give the js-soroban-client a workout
// Example:
// Using the soroban-client server

const SorobanClient = require("soroban-client");

const server = new SorobanClient.Server(
  "https://rpc-futurenet.stellar.org:443"
);
let result;

// This is our test smart contract, testsc  You can test different datatypes
// and authentications with it.  See the testsc.bindings.json file for the
// bindings.
const testsc = "";
const contract = new SorobanClient.Contract(testsc);

result = await server.getHealth();
console.dir(result);

result = await server.getNetwork();
console.dir(result);

const keyPair = SorobanClient.Keypair.random();
const publicKey = keyPair.publicKey();
const secret = keyPair.secret();

// This creates the keypair account on futurenet
result = await server.requestAirdrop(publicKey);
console.dir(result);

// This will return the account information and the sequence number
result = await server.getAccount(publicKey);
let account = result;
console.dir(result);

// This will return the latest ledger on futurenet
result = await server.getLatestLedger();
console.dir(result);

// Let's create a transaction
const source = publicKey;

let tx = SorobanClient.TransactionBuilder(account, {
  fee: 100,
  networkPassphrase: SorobanClient.Networks.FUTURENET,
  v1: true,
})
  .addOperation(contract.call("hello", SorobanClient.nativeToScVal("World!")))
  .setTimeout(SorobanClient.TimeoutInfinite)
  .build();

result = await server.prepareTransaction(tx, networkPassphrase);
console.dir(result);

result = await server.simulateTransaction(tx);
console.dir(result);

result = await server.sendTransaction(tx);
let hash = result.hash;
console.dir(result);

result = await server.getTransaction(hash);
console.dir(result);

const exampleFilter = {
  startLedger: "1000",
  filters: [
    {
      type: "contract",
      contractIds: ["deadb33f..."],
      topics: [["AAAABQAAAAh0cmFuc2Zlcg==", "AAAAAQB6Mcc=", "*"]],
    },
    {
      type: "system",
      contractIds: ["...c4f3b4b3..."],
      topics: [["*"], ["*", "AAAAAQB6Mcc="]],
    },
    {
      contractIds: ["...c4f3b4b3..."],
      topics: [["AAAABQAAAAh0cmFuc2Zlcg=="]],
    },
    {
      type: "diagnostic",
      topics: [["AAAAAQB6Mcc="]],
    },
  ],
  limit: 10,
};

result = await server.getEvents(exampleFilter);
console.dir(result);

result = server.findCreatedAccountSequenceInTransactionMeta(meta);
console.dir(result);
