const SorobanClient = require("soroban-client");

const pk = "GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH";
const secret = "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL";

// Call the smart option contract function "list"

const server = new SorobanClient.Server("https://rpc-futurenet.stellar.org:443");

/*
Current ContractId: e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19

As StrKey: CDUUOYHANWRSQNX6RXGHDZ5THWYMKKL2RODO4LNQ4I7KLZQSGU5RSWB3

USDC Token (Wrapped Stellar Classic Asset) used for collateral
Current ContractId: (SAC Token ID): a95bdc05cf685ab4379aca06e3acdb9dc7d7ac869e199d617d60b2a9ba067db5

As StrKey: CCUVXXAFZ5UFVNBXTLFANY5M3OO4PV5MQ2PBTHLBPVQLFKN2AZ63KERY

Contract Name: USDC:GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y

Contract Symbol: USDC
*/
//test
//const adr = new SorobanClient.Address("GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y").toScVal();

//write a function to create a contract transaction

function createContractTransaction(networkPassphrase, sourceAccount, contractId, method, ...args) {
    console.log(`Inside createContractTransaction with contract id: ${contractId}, method: ${method}`)
    let myArgs = args || [];
    const contract = new SorobanClient.Contract(contractId);

    // console.log(
    //     `Creating contract transaction for ${contractId} ${util.inspect(
    //         sourceAccount,
    //         false,
    //         3,
    //         true
    //     )} ${method} ${myArgs}`
    // );

    return new SorobanClient.TransactionBuilder(sourceAccount, {
        fee: 100,
        networkPassphrase: networkPassphrase,
    })
        .addOperation(contract.call(method, ...myArgs))
        .setTimeout(SorobanClient.TimeoutInfinite)
        .build();
}



async function invokeContract(params){
    console.log("Inside invokeContract")
    let body = params.body;
    let src = params.publicKey;
    let source = await server.getAccount(body.publicKey)

    console.log("Calling createContractTransaction")
    let tx = createContractTransaction(
        SorobanClient.Networks.FUTURENET,
        source,
        body.contractId,
        body.method,
        ...body.params
    );
    console.log("Back from createContractTransaction. Simulating...")

    const sim = await server.simulateTransaction(tx);
    console.log("Simulation complete. Prepping tx...")

    tx = await server.prepareTransaction(tx, SorobanClient.Networks.FUTURENET);
    console.log("Prep Complete. Signing...")

    tx.sign(SorobanClient.Keypair.fromSecret(body.secret));
    
    let result = await server.submitTransaction(tx);

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


async function main() {
    const account = await server.getAccount(pk);
    // const contract = new SorobanClient.Contract(
    //     "e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19"
    // );
    const contract = "e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19"

    console.log(contract);

    // const params = {
    //     env: "test",
    //     opt_type: "put",
    //     strike: 0.5,
    //     decimals: 7,
    //     exp: 1625097600,
    //     oracle: "e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19",
    //     token:  "a95bdc05cf685ab4379aca06e3acdb9dc7d7ac869e199d617d60b2a9ba067db5",
    //     admin:  "GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y"
    // }
    //const address1 = new SorobanClient.Address("e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19").toScVal();
    // const address2 = new SorobanClient.Address("a95bdc05cf685ab4379aca06e3acdb9dc7d7ac869e199d617d60b2a9ba067db5").toScVal();
    // const address3 = new SorobanClient.Address("GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y").toScVal();

    const params = [
        SorobanClient.nativeToScVal(1, {type: 'u32'}),
        SorobanClient.nativeToScVal(1, {type: 'i128'}),
        SorobanClient.nativeToScVal(7, {type: 'u32'}),
        SorobanClient.nativeToScVal(1625097600, {type: 'u64'}),
        // address1,
        // address2,
        // address3,
        SorobanClient.nativeToScVal("e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19"),
        SorobanClient.nativeToScVal("a95bdc05cf685ab4379aca06e3acdb9dc7d7ac869e199d617d60b2a9ba067db5"),
        SorobanClient.nativeToScVal("GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y"),
    ]

    const args = {
        body: 
        {
            params: params,
            method: "list",
            contractId: contract,
        }
    }
    console.log("Calling invoke contract")
    return await invokeContract({
        body: {
            publicKey: pk,
            secret: secret,
            params: params,
            method: "list",
            contractId: contract,
        }
    })

    // const tx = new SorobanClient.TransactionBuilder(account, {
    //     fee: 100,
    //     networkPassphrase: SorobanClient.Networks.FUTURENET,
    // })
    //     .addOperation(contract.call("list"))
    //     .setTimeout(SorobanClient.TimeoutInfinite)
    //     .build();
    
    // tx.sign(SorobanClient.Keypair.fromSecret(secret));
    
    // try {
    //     const response = await server.submitTransaction(tx);
    //     console.log( "Success! Results:", response );
    // } catch (e) {
    //     console.log( "Failure! Error:", e.response.data.extras.result_codes );
    // }
}

main();