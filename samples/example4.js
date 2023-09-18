// Give the js-soroban-client a workout
// Example:
// Using the soroban-client server

const SorobanClient = require("soroban-client");
const util = require("util");

const nativeAssetContractId =
  "CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT";
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

console.log(`keyPair2: ${keyPair2.publicKey()}`);


function hashPreImage(
  networkPassphrase, //: string,
  invocation, //: SorobanClient.xdr.SorobanAuthorizedInvocation,
  ledgerValidityCount, //: number,
  nonce
) {
  let networkId = SorobanClient.hash(Buffer.from(networkPassphrase));
  networkId = Buffer.from(networkId).subarray(0,32);

  const n = SorobanClient.xdr.Int64.fromString(nonce); // don't actually do this lmao

  const hashIdPreimageAuth = new SorobanClient.xdr.HashIdPreimageSorobanAuthorization({
    networkId,
    invocation,
    nonce: n,
    signatureExpirationLedger: ledgerValidityCount,
  });

  const preimage = xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
    hashIdPreimageAuth,
  );

  const env = preimage.toXDR("raw");
  return SorobanClient.hash(env);
}

function sigArgs(signer, networkPassphrase, rootInvocation, ledgerValidityCount, nonce) {
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

function signAuthorizationEntry(
  signer, //: Keypair,
  networkPassphrase, //: string,
  rootInvocation, //: SorobanClient.xdr.SorobanAuthorizedInvocation,
  ledgerValidityCount, //: number,
  nonce // string
) {
  const h = hashPreImage(
    networkPassphrase,
    rootInvocation,
    ledgerValidityCount,
    nonce
  );
  const sig = signer.sign(h);

  return new SorobanClient.xdr.SorobanAuthorizationEntry({
    credentials: SorobanClient.xdr.SorobanCredentials.sorobanCredentialsAddress(
      new SorobanClient.xdr.SorobanAddressCredentials({
        address: new SorobanClient.Address(signer.publicKey()).toScAddress(),
        nonce: SorobanClient.xdr.Int64.fromString(nonce),
        signatureExpirationLedger: ledgerValidityCount,
        signatureArgs: [
          SorobanClient.nativeToScVal({
            public_key: signer.rawPublicKey(),
            signature: sig,
          }),
        ],
      })
    ),
    rootInvocation,
  });
}

function invocation(contractId, functionName, args = [], subInvocations = []) {
  return new SorobanClient.xdr.SorobanAuthorizedInvocation({
    function:
      SorobanClient.xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        new SorobanClient.xdr.SorobanAuthorizedContractFunction({
          contractAddress: new SorobanClient.Address(contractId).toScAddress(),
          functionName: functionName,
          args: args,
        })
      ),
    subInvocations: subInvocations,
  });
}

async function testHashPreImage() {
  let inv = invocation(
    testsc,
    "hello",
    [SorobanClient.nativeToScVal("World", { type: "symbol" })],
    []
  );

  let result = hashPreImage(SorobanClient.Networks.FUTURENET, inv, 1000);
  console.dir(result);
}

//testHashPreImage();

async function main() {

  const server = new SorobanClient.Server(
    "https://rpc-futurenet.stellar.org:443"
  );
  let result;
  let account;

  // This is our test smart contract, testsc  You can test different datatypes
  // and authentications with it.  See the testsc.bindings.json file for the
  // bindings.

  result = await server.getHealth();
  console.dir(result);

  result = await server.getNetwork();
  console.dir(result);

  //   const keyPair = SorobanClient.Keypair.random();

  //   // This creates the keypair account on futurenet
  //   result = await server.requestAirdrop(publicKey);
  //   console.dir(result);

  // This will return the account information and the sequence number
  result = await server.getAccount(publicKey);
  account = result;
  console.dir(result);

  // This will return the latest ledger on futurenet
  result = await server.getLatestLedger();
  const currentLedger = result.sequence;
  console.dir(result);

  // Let's create a transaction
  const source = publicKey;

  let tx = new SorobanClient.TransactionBuilder(account, {
    fee: "10000000",
    networkPassphrase: SorobanClient.Networks.FUTURENET,
  })
    // .addOperation(
    //   contract.call(
    //     "hello",
    //     SorobanClient.nativeToScVal("World", { type: "symbol" })
    //   )
    // )
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

  //   console.log(`Simulating transaction, tx`);
  //   result = await server.simulateTransaction(tx);
  //   console.dir(result);

  console.log(`Preparing transaction, tx`);
  result = await server.prepareTransaction(
    tx,
    SorobanClient.Networks.FUTURENET
  );
  console.log(`Prepared transaction, tx`);
  console.dir(result);
  //   console.log(`Operations: ${result.operations.length}`);
  //   // This should be invokeHostFunction
  //   console.log(`Op[0].type: ${result.operations[0].type}`);
  //   // This is the source account credentials
  //   console.log(
  //     `Op[0].auth[0]: ${util.inspect(result.operations[0].auth[0], false, 4)}`
  //   );
  //   // This is the first function call that requires a signature
  //   console.log(
  //     `Op[0].auth[1]: ${util.inspect(result.operations[0].auth[1], false, 4)}`
  //   );

  // Now we can take the prepared transaction and add the authorization
  // to it.  This is the authorization for the first function call.
  // Let's get the parameters to make the new authorization
  console.log(`Old prepared transaction address auths, result`);
  console.log(`result.operations[0].auth[1] ${util.inspect(result.operations[0].auth[1], false, 4)}`);
  const nonce = result.operations[0].auth[1].credentials().value().nonce();
  //console.log(`nonce: ${nonce}`);
  const address = result.operations[0].auth[1].credentials().value().address();
  //console.log(`address: ${address}`);
  const rootInvocation = result.operations[0].auth[1].rootInvocation();
  // Replace the authorization with the new signed authorization
//   result.operations[0].auth[1] = signAuthorizationEntry(
//     keyPair2,
//     SorobanClient.Networks.FUTURENET,
//     rootInvocation,
//     currentLedger + 1000,
//     nonce.toString()
//   );
    result.operations[0].auth[1]._attributes.credentials._value._attributes.signatureArgs = sigArgs(
    keyPair2,
    SorobanClient.Networks.FUTURENET,
    rootInvocation,
    currentLedger + 1000,
    nonce.toString()
    );

  // You need to send the prepared transaction to the network which
  // is the result of the prepareTransaction call.
  tx = result;

  console.log(`New prepared transaction address auths, tx`);
  console.log(`tx.operations[0].auth[1] ${util.inspect(tx.operations[0].auth[1], false, 4)}`);

  console.log(`Signing transaction with source keyPair`);
  tx.sign(keyPair);

  console.log(`Sending transaction`);
  result = await server.sendTransaction(tx);
  let hash = result.hash;
  console.dir(result);

  const interval = setInterval(async () => {
    const res = await server.getTransaction(hash);

    if (res.status === "SUCCESS" || res.status === "ERROR" || res.status === "FAILED")
      clearInterval(interval);

    console.log(res);
  }, 2000);
}

//main();

async function getTxStatus(hash) {
  const server = new SorobanClient.Server(
    "https://rpc-futurenet.stellar.org:443"
  );
  let result;

  result = await server.getTransaction(hash);
  console.dir(result);
}
//getTxStatus("b38ba1620c237d3646762f860dcdbec7dcfd393c4f1edc2b7e5fc72737a58b12");

// result = await server.getEvents(exampleFilter);
// console.dir(result);

// result = server.findCreatedAccountSequenceInTransactionMeta(meta);
// console.dir(result);

// const exampleFilter = {
//     startLedger: "1000",
//     filters: [
//       {
//         type: "contract",
//         contractIds: ["deadb33f..."],
//         topics: [["AAAABQAAAAh0cmFuc2Zlcg==", "AAAAAQB6Mcc=", "*"]],
//       },
//       {
//         type: "system",
//         contractIds: ["...c4f3b4b3..."],
//         topics: [["*"], ["*", "AAAAAQB6Mcc="]],
//       },
//       {
//         contractIds: ["...c4f3b4b3..."],
//         topics: [["AAAABQAAAAh0cmFuc2Zlcg=="]],
//       },
//       {
//         type: "diagnostic",
//         topics: [["AAAAAQB6Mcc="]],
//       },
//     ],
//     limit: 10,
//   };
