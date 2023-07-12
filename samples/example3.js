const SorobanClient = require("soroban-client");

const pk = "GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH";
const secret = "SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL";

// Call the smart option contract function "list"

const server = SorobanClient("https://rpc-futurenet.stellar.org:443");

async function main() {
    const account = await server.loadAccount(pk);
    const contract = new SorobanClient.Contract(
        "e1f77313773d8e429836c080e5470bdfb28f34f33847827601b0c540ace109bf"
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
        console.log( "Failure! Error:", e.response.data.extras.result_codes );
    }
}
