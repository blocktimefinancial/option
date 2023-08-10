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

const server = new SorobanClient.Server("https://rpc-futurenet.stellar.org:443");

const contract = new SorobanClient.Contract("CA54PF5JMMOJRBWFERLFJVPLUIGUCZPJZZYFYULL6PG75GLDRIDDTKHL");
const signer1 = SorobanClient.Keypair.fromSecret("SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL");
const signer2 = SorobanClient.Keypair.fromSecret("SBNBRB3CTNUNXGOIKB5NGVSJNXASLYTJ5IUYAKNWM2OSOFHJGUDN5DNN");

async function main() {

    // Get the source account from the ledger
    const source = await server.getAccount(signer1.publicKey());
    console.dir(source);
    
    // Get the current ledger
    const currentLedger = await server.getLatestLedger();
    console.dir(currentLedger);
    
    // Set the signature valid ledger number
    const validUntilLedger = currentLedger.sequence + 1000;
    console.log(`validUntilLedger: ${validUntilLedger}`);
    
    // Build the InvokeHostFunctionOp
    const invokeHostFuncOp = contract.call(
        "dbl_sign_test",
        new SorobanClient.Address(signer1.publicKey()).toScVal(),
        new SorobanClient.Address(signer2.publicKey()).toScVal()
    );
    console.dir(invokeHostFuncOp);
    
    // Build the transaction that needs the source and signer2
    let tx = new SorobanClient.TransactionBuilder(source, {
    fee: "10000000",
    networkPassphrase: SorobanClient.Networks.FUTURENET,
    })
    .addOperation(invokeHostFuncOp)
    .setTimeout(SorobanClient.TimeoutInfinite)
    .build();

    // Simulate the transaction
    let simTx = await server.simulateTransaction(tx);
    console.dir(simTx);
    
    console.log(`Now we're signing...`);

    // We should have two entries here, one for the source of the transaction,
    // and one for the second address require_auth() in the SC. @george
    const entries = simTx.results[0].auth.map(
        entry => SorobanClient.xdr.SorobanAuthorizationEntry.fromXDR(entry, 'base64'));
    assert(entries.length === 2); // sanity check

    // find the entry that needs an extra sig
    const needsSig = entries.findIndex(entry => 
        entry.credentials().switch() !== 
            SorobanClient.xdr.SorobanCredentialsType.sorobanCredentialsSourceAccount());
    assert(needsSig === 0 || needsSig === 1); // sanity check
    
    const noSig = Number(!needsSig); // cheat a bit to get the "other" entry
    
    // Dump the source credentials authEntry
    console.dir(entries[noSig]);
    
    let builder = SorobanClient.TransactionBuilder.cloneFrom(tx);
    // this is a hack until we add a TransactionBuilder.clearOperations()
    
    // Let's build the auth entry for signer2
    const authEntrySigner2 = SorobanClient.authorizeInvocation(
            signer2,
            SorobanClient.Networks.FUTURENET,
            validUntilLedger,
            entries[needsSig].rootInvocation()
        );
    console.dir(authEntrySigner2);
    
    // Now we add both auth entries to the cloned "builder" transaction.
    builder.operations[0].auth = [ 
        entries[noSig],
        authEntrySigner2
    ];

    // Assemble the transaction for signing by the source
    const readyTx = SorobanClient.assembleTransaction(builder.build(), SorobanClient.Networks.FUTURENET, simTx);
    
    // Sign the entire transaction with the source account keypair
    readyTx.sign(signer1);

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
        if(res.status === "FAILED") {
            console.dir(res.resultXdr);
            console.dir(res.resultMetaXdr);
        }
    }, 2000);
    
}

main();