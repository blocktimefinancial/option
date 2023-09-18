// Name: authorizeInvocation Example
// Author: LJM, @george (Discord), @kalepail (Discord)
// Date: 8/9/23
// Desc: A NodeJS example to sign a transaction that requires multiple authorizations in the
//       Soroban Smart Contract.  The example Smart Contract function looks like this:
//       pub fn dbl_sign_test(env: Env, a: Address, b: Address) -> (Address, Address) {
//           a.require_auth();
//           b.require_auth();
//           (a, b)
//       }

const SorobanClient = require("soroban-client");
const util = require("util");
const assert = require("assert");

const server = new SorobanClient.Server(
  "https://rpc-futurenet.stellar.org:443"
);

const contract = new SorobanClient.Contract(
  "CA54PF5JMMOJRBWFERLFJVPLUIGUCZPJZZYFYULL6PG75GLDRIDDTKHL"
);

console.log(SorobanClient.StrKey.isValidContract("CA54PF5JMMOJRBWFERLFJVPLUIGUCZPJZZYFYULL6PG75GLDRIDDTKHL"));
const scvAddr = new SorobanClient.Address("CA54PF5JMMOJRBWFERLFJVPLUIGUCZPJZZYFYULL6PG75GLDRIDDTKHL").toScAddress();

const signer1 = SorobanClient.Keypair.fromSecret(
  "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL"
);
const signer2 = SorobanClient.Keypair.fromSecret(
  "SBNBRB3CTNUNXGOIKB5NGVSJNXASLYTJ5IUYAKNWM2OSOFHJGUDN5DNN"
);

async function buildAuthCall(contract, signer1, signer2) {
  // Get the source account from the ledger
  const source = await server.getAccount(signer1.publicKey());
  console.dir(source);

  // Get the current ledger
  const currentLedger = await server.getLatestLedger();
  console.dir(currentLedger);

  // Set the signature valid ledger number
  const validUntilLedger = currentLedger.sequence + 100000;
  console.log(`validUntilLedger: ${validUntilLedger}`);

  // Build the InvokeHostFunctionOp
  const invokeHostFuncOp = contract.call(
    "dbl_sign_test",
    ...[
      new SorobanClient.Address(signer1.publicKey()).toScVal(),
      new SorobanClient.Address(signer2.publicKey()).toScVal(),
    ]
  );
  console.dir(invokeHostFuncOp);

  // Build the transaction that needs the source and signer2
  let tx = new SorobanClient.TransactionBuilder(source, {
    fee: "10000000",
    networkPassphrase: SorobanClient.Networks.FUTURENET,
  })
    .addOperation(invokeHostFuncOp)
    .setTimeout(SorobanClient.TimeoutInfinite);

  const built = tx.build();

  // Simulate the transaction
  let simTx = await server.simulateTransaction(built);
  console.dir(simTx);

  const sorobanTxData = SorobanClient.xdr.SorobanTransactionData.fromXDR(
    simTx.transactionData,
    "base64"
  );

  const footprintXdr = sorobanTxData.resources().footprint().toXDR("base64");

  const preparedTx = SorobanClient.assembleTransaction(
    built,
    SorobanClient.Networks.FUTURENET,
    simTx
  );
  console.dir(preparedTx);

  
  return {
    preparedTransaction: preparedTx,
    footprint: sorobanTxData.resources().footprint().toXDR("base64"),
  };
}

async function submitTx(readyTx) {
  console.log(`Sending transaction`);
  result = await server.sendTransaction(readyTx);
  let hash = result.hash;

  // Check the transaction result every 2000ms (2 seconds) @kalepail
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

async function signContractAuth(contract, signer, tx, networkPassphrase) {
    console.log(`tx.source: ${tx.source} tx.sequence: ${tx.sequence}`);
  const source = new SorobanClient.Account(tx.source, `${parseInt(tx.sequence, 10) - 1}`);
  const txnBuilder = new SorobanClient.TransactionBuilder(source, {
    fee: tx.fee,
    networkPassphrase,
    timebounds: tx.timeBounds,
    ledgerbounds: tx.ledgerBounds,
    minAccountSequence: tx.minAccountSequence,
    minAccountSequenceAge: tx.minAccountSequenceAge,
    minAccountSequenceLedgerGap: tx.minAccountSequenceLedgerGap,
  });

  // Soroban transaction can only have 1 operation
  const rawInvokeHostFunctionOp = tx.operations[0];

  const auth = rawInvokeHostFunctionOp.auth ? rawInvokeHostFunctionOp.auth : [];

  const signedAuth = await buildContractAuth(
    auth,
    signer,
    networkPassphrase,
    contract,
    server,
  );

  txnBuilder.addOperation(
    SorobanClient.Operation.invokeHostFunction({
      ...rawInvokeHostFunctionOp,
      auth: signedAuth,
    }),
  );
  
  return txnBuilder.build();
}

async function buildContractAuth(authEntries, signer, networkPassphrase, contract, server) {
    const contractId = contract.address().toString();
    const scvAddr = new SorobanClient.Address(contractId).toScAddress();
    const signedAuthEntries = [];
    for (const entry of authEntries) {
        if (
          entry.credentials().switch() !==
          SorobanClient.xdr.SorobanCredentialsType.sorobanCredentialsAddress()
        ) {
          signedAuthEntries.push(entry);
        } else {
          const entryAddress = entry.credentials().address().address().accountId();
          const entryNonce = entry.credentials().address().nonce();

          if (
            signer.publicKey() === SorobanClient.StrKey.encodeEd25519PublicKey(entryAddress.ed25519())
          ) {
            let expirationLedgerSeq = 0;
    
            const key = SorobanClient.xdr.LedgerKey.contractData(
              new SorobanClient.xdr.LedgerKeyContractData({
                contract: scvAddr,
                key: SorobanClient.xdr.ScVal.scvLedgerKeyContractInstance(),
                durability: SorobanClient.xdr.ContractDataDurability.persistent(),
                bodyType: SorobanClient.xdr.ContractEntryBodyType.dataEntry(),
              }),
            );
    
            // Fetch the current contract ledger seq
            // eslint-disable-next-line no-await-in-loop
            const entryRes = await server.getLedgerEntries([key]);
            if (entryRes.entries && entryRes.entries.length) {
              const parsed = SorobanClient.xdr.LedgerEntryData.fromXDR(
                entryRes.entries[0].xdr,
                "base64",
              );
              // TODO: Should we bump this here with a future ledger
              expirationLedgerSeq = parsed.contractData().expirationLedgerSeq();
            } else {
              throw new Error("ERRORS.CANNOT_FETCH_LEDGER_ENTRY");
            }
    
            const passPhraseHash = SorobanClient.hash(Buffer.from(networkPassphrase));
            const invocation = entry.rootInvocation();
            const hashIDPreimageAuth = new SorobanClient.xdr.HashIdPreimageSorobanAuthorization({
              networkId: Buffer.from(passPhraseHash).subarray(0, 32),
              invocation,
              nonce: entryNonce,
              signatureExpirationLedger: expirationLedgerSeq,
            });
    
            const preimage =
              SorobanClient.xdr.HashIdPreimage.envelopeTypeSorobanAuthorization(
                hashIDPreimageAuth,
              );

            const preimageHash = SorobanClient.hash(preimage.toXDR());
    
            // This is where a "wallet" or "custodian" could sign the transaction
            // but in this case, we have the signing keypair so just sign.
            // eslint-disable-next-line no-await-in-loop
            const signature = signer.sign(preimageHash); // not a string in this instance
    
            const authEntry = new SorobanClient.xdr.SorobanAuthorizationEntry({
              credentials: SorobanClient.xdr.SorobanCredentials.sorobanCredentialsAddress(
                new SorobanClient.xdr.SorobanAddressCredentials({
                  address: new SorobanClient.Address(signer.publicKey()).toScAddress(),
                  nonce: hashIDPreimageAuth.nonce(),
                  signatureExpirationLedger:
                    hashIDPreimageAuth.signatureExpirationLedger(),
                  signatureArgs: [
                    SorobanClient.nativeToScVal(
                      {
                        public_key: SorobanClient.StrKey.decodeEd25519PublicKey(signer.publicKey()),
                        signature: new Uint8Array(signature.data),
                      },
                      {
                        type: {
                          public_key: ["symbol", null],
                          signature: ["symbol", null],
                        },
                      },
                    ),
                  ],
                }),
              ),
              rootInvocation: invocation,
            });
            signedAuthEntries.push(authEntry);
          } else {
            signedAuthEntries.push(entry);
          }
        }
      }
    
      console.dir(signedAuthEntries);
      
      return signedAuthEntries;
}

async function main() {
  let authCall = await buildAuthCall(contract, signer1, signer2);
  console.log(`Contract Address: ${contract.address()}`);
  let signedTx = await signContractAuth(contract, signer2, authCall.preparedTransaction, SorobanClient.Networks.FUTURENET);
  signedTx.sign(signer1);
  console.log(signedTx.toEnvelope().toXDR("base64"));
  const result = await submitTx(signedTx);
}

main();
