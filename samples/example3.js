// This example is for Preview 10 of the Soroban SDK.  SorobanClient is now
// version 0.9.1
const SorobanClient = require("soroban-client");

// Futurenet admin address/account for the Smart Option Contract Project.
const pk = "GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH";
const secret = "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL";


// Extra test addresses/accounts
const addr1 = "";
const addr1Secret = "";
const addr2 = "";
const addr2Secret = "";


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

const adr = new SorobanClient.Address("GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y").toScVal();

async function main() {
    const account = new SorobanClient.Account(pk, "1");
    const contract = new SorobanClient.Contract(
        "CDUUOYHANWRSQNX6RXGHDZ5THWYMKKL2RODO4LNQ4I7KLZQSGU5RSWB3"
    );
    
    const scVal = SorobanClient.nativeToScVal(1);

    const tx = new SorobanClient.TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: SorobanClient.Networks.FUTURENET,
    })
        .addOperation(contract.call("init"))
        .setTimeout(SorobanClient.TimeoutInfinite)
        .build();
    
    tx.sign(SorobanClient.Keypair.fromSecret(secret));

    result = await SorobanClient.sendTransaction(tx);

  console.log("Tx sendTransaction result: ", result.result);
  const hash = result.result.hash;
  let status = result.result.status;
  let timeout = 0;
  let maxTimeout = 30000;
  do {
    await sleep(2000);
    timeout += 1000;
    console.log(`Looking for Tx status: ${hash} after ${timeout} ms...`);
    result = await SorobanClient.getTransaction(hash);
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

main();
