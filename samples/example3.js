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

const adr = new SorobanClient.Address("GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y").toScVal();

async function main() {
    const account = new SorobanClient.Account(pk, "1");
    const contract = new SorobanClient.Contract(
        "CDUUOYHANWRSQNX6RXGHDZ5THWYMKKL2RODO4LNQ4I7KLZQSGU5RSWB3"
    );
    
    const tx = new SorobanClient.TransactionBuilder(account, {
        fee: 100,
        networkPassphrase: SorobanClient.Networks.FUTURENET,
    })
        .addOperation(contract.call("list"))
        .setTimeout(SorobanClient.TimeoutInfinite)
        .build();
    
    tx.sign(SorobanClient.Keypair.fromSecret(secret));

    try {
        const response = await server.submitTransaction(tx);
        console.log( "Success! Results:", response );
    } catch (e) {
        console.dir( "Failure! Error:", e );
    }
}

main();
