const util = require("util");
const SorobanClient = require("soroban-client");
const xdr = SorobanClient.xdr;

const testsc = "CCT76EENITUCBWSZAGVW2NEQPDKJFMJFVFCYLEPOJPGGGWWJGTK7XUQE";
const contract = new SorobanClient.Contract(testsc);
const keyPair = SorobanClient.Keypair.fromSecret(
  "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL"
);
const publicKey = keyPair.publicKey();
const secret = keyPair.secret();
const keyPair2 = SorobanClient.Keypair.fromSecret(
  "SBQK63DKAEZAQJPM66RX4HM5OLWSE2YDCGIKNHS2MGMPOLHESLN6ZQH6"
);

function hashPreImage(
  networkPassphrase, //: string,
  invocation, //: SorobanClient.xdr.SorobanAuthorizedInvocation,
  ledgerValidityCount, //: number,
  nonce //: string
) {
  const networkId = SorobanClient.hash(Buffer.from(networkPassphrase));
  const n = SorobanClient.xdr.Int64.fromString(nonce);

  const envelope = new SorobanClient.xdr.HashIdPreimageSorobanAuthorization({
    networkId,
    invocation,
    nonce: n,
    signatureExpirationLedger: ledgerValidityCount,
  });

  const env = envelope.toXDR("raw");
  return SorobanClient.hash(env);
}

function signArgs(
  signer,
  networkPassphrase,
  rootInvocation,
  ledgerValidityCount,
  nonce
) {
  const h = hashPreImage(
    networkPassphrase,
    rootInvocation,
    ledgerValidityCount,
    nonce
  );
  const sig = signer.sign(h);
  return [
    SorobanClient.nativeToScVal({
      public_key: signer.rawPublicKey(),
      signature: sig,
    }),
  ];
}

async function main() {
  const server = new SorobanClient.Server(
    "https://rpc-futurenet.stellar.org:443"
  );
  let result;
  let account;

  // This will return the account information and the sequence number
  account = await server.getAccount(publicKey);

  // This will return the latest ledger on futurenet
  result = await server.getLatestLedger();
  const currentLedger = result.sequence;

  let tx = new SorobanClient.TransactionBuilder(account, {
    fee: "10000000",
    networkPassphrase: SorobanClient.Networks.FUTURENET,
  })
    .addOperation(
      contract.call(
        "dbl_sign_test",
        new SorobanClient.Address(keyPair.publicKey()).toScVal(),
        new SorobanClient.Address(keyPair2.publicKey()).toScVal()
      )
    )
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();

  let simTx = await server.simulateTransaction(tx);
  
  return;

  let invocation = simTx.operations[0].auth[1].rootInvocation();
  let authInvocation = SorobanClient.authorizeInvocation(
    keyPair2,
    SorobanClient.Networks.FUTURENET,
    invocation,
    currentLedger + 1000
  );

  // console.log(`Preparing transaction, tx`);
  // tx = await server.prepareTransaction(tx, SorobanClient.Networks.FUTURENET);
  // const nonce = tx.operations[0].auth[1].credentials().value().nonce();
  // const rootInvocation = tx.operations[0].auth[1].rootInvocation();
  // tx.operations[0].auth[1]._attributes.credentials._value._attributes.signatureArgs =
  //   signArgs(
  //     keyPair2,
  //     SorobanClient.Networks.FUTURENET,
  //     rootInvocation,
  //     currentLedger + 1000,
  //     nonce.toString()
  //   );

  console.log(`Signing transaction with source keyPair`);
  tx.sign(keyPair);

  console.log(`Sending transaction`);
  result = await server.sendTransaction(tx);
  let hash = result.hash;

  const interval = setInterval(async () => {
    const res = await server.getTransaction(hash);

    if (
      res.status === "SUCCESS" ||
      res.status === "ERROR" ||
      res.status === "FAILED"
    )
      clearInterval(interval);

    console.log(res);
  }, 2000);
}

main();
