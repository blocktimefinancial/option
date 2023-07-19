// Give the js-soroban-client a workout
// Example:
// Using the soroban-client server

const SorobanClient = require("soroban-client");

function authorizeInvocation(
  signer, //: Keypair,
  networkPassphrase, //: string,
  invocation, //: SorobanClient.xdr.SorobanAuthorizedInvocation,
  ledgerValidityCount //: number,
) {
  //: xdr.SorobanAuthorizationEntry
  const networkId = SorobanClient.hash(Buffer.from(networkPassphrase));
  const nonce = new SorobanClient.xdr.Uint64(1); // don't actually do this lmao
 
  const envelope = new SorobanClient.xdr.HashIdPreimageSorobanAuthorization({
    networkId,
    invocation,
    nonce: nonce,
    signatureExpirationLedger: ledgerValidityCount,
  });

  const env = envelope.toXDR("raw");
  const sig = signer.sign(SorobanClient.hash(env));

  return new SorobanClient.xdr.SorobanAuthorizationEntry({
    credentials: SorobanClient.xdr.SorobanCredentials.sorobanCredentialsAddress(
      new SorobanClient.xdr.SorobanAddressCredentials({
        address: new SorobanClient.Address(signer.publicKey()).toScAddress(),
        nonce: envelope.nonce(),
        signatureExpirationLedger: envelope.signatureExpirationLedger(),
        signatureArgs: [
          SorobanClient.nativeToScVal({
            public_key: signer.rawPublicKey(),
            signature: sig,
          }),
        ],
      })
    ),
    rootInvocation: invocation,
  });
}

function invocation(contractId, functionName, args = [], subInvocations = []) {
  return new SorobanClient.xdr.SorobanAuthorizedInvocation({
    contractId: new SorobanClient.Address(contractId).toScVal(),
    functionName: SorobanClient.nativeToScVal(functionName, { type: "string" }),
    args: args,
    subInvocations: subInvocations,
  });
}

async function main() {
  const server = new SorobanClient.Server(
    "https://rpc-futurenet.stellar.org:443"
  );
  let result;

  // This is our test smart contract, testsc  You can test different datatypes
  // and authentications with it.  See the testsc.bindings.json file for the
  // bindings.
  const testsc = "CCT76EENITUCBWSZAGVW2NEQPDKJFMJFVFCYLEPOJPGGGWWJGTK7XUQE";
  const contract = new SorobanClient.Contract(testsc);

  const keyPair2 = SorobanClient.Keypair.fromSecret(
    "SBQK63DKAEZAQJPM66RX4HM5OLWSE2YDCGIKNHS2MGMPOLHESLN6ZQH6"
  );

  result = await server.getHealth();
  console.dir(result);

  result = await server.getNetwork();
  console.dir(result);

  //   const keyPair = SorobanClient.Keypair.random();
  const keyPair = SorobanClient.Keypair.fromSecret(
    "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL"
  );
  const publicKey = keyPair.publicKey();
  const secret = keyPair.secret();

  //   // This creates the keypair account on futurenet
  //   result = await server.requestAirdrop(publicKey);
  //   console.dir(result);

  // This will return the account information and the sequence number
  result = await server.getAccount(publicKey);
  let account = result;
  console.dir(result);

  // This will return the latest ledger on futurenet
  result = await server.getLatestLedger();
  console.dir(result);

  // Let's create a transaction
  const source = publicKey;

  let tx = new SorobanClient.TransactionBuilder(account, {
    fee: 100000,
    networkPassphrase: SorobanClient.Networks.FUTURENET,
    v1: true,
  })
    //.addOperation(contract.call("hello", SorobanClient.nativeToScVal("World", {type: "symbol"})))
    // .addOperation(
    //   contract.call(
    //     "signing_test",
    //     new SorobanClient.Address(keyPair.publicKey()).toScVal()
    //   )
    // )
    .addOperation(
      contract.call(
        "dbl_sign_test",
        new SorobanClient.Address(keyPair.publicKey()).toScVal(),
        new SorobanClient.Address(keyPair2.publicKey()).toScVal()
      )
    )
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();

  console.log(`Simulating transaction`);
  result = await server.simulateTransaction(tx);
  console.dir(result);

  let rootInvocation = invocation(testsc, "dbl_sign_test", [
    new SorobanClient.Address(keyPair.publicKey()).toScVal(),
    new SorobanClient.Address(keyPair2.publicKey()).toScVal(),
  ]);

  const auth = authorizeInvocation(
    keyPair2,
    SorobanClient.Networks.FUTURENET,
    rootInvocation,
    100
  );

  console.log(`Preparing transaction`);
  result = await server.prepareTransaction(
    tx,
    SorobanClient.Networks.FUTURENET
  );
  console.dir(result);
  // You need to send the prepared transaction to the network which
  // is the result of the prepareTransaction call.
  tx = result;

  console.log(`Signing transaction`);
  tx.sign(keyPair);
  tx.sign(auth);

  console.log(`Sending transaction`);
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
}

async function getTxStatus(hash) {
  const server = new SorobanClient.Server(
    "https://rpc-futurenet.stellar.org:443"
  );
  let result;

  result = await server.getTransaction(hash);
  console.dir(result);
}

//getTxStatus("247724592fe5956c318c4f1478be445873d7a2a98e0e0083a6ae893c196dee5b");

main();
// result = await server.getEvents(exampleFilter);
// console.dir(result);

// result = server.findCreatedAccountSequenceInTransactionMeta(meta);
// console.dir(result);
