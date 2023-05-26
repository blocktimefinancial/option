// Usage: node strKeyAddress.js <contractId>
// Purpose: Convert a contractId to a strkey address and back again
// Why: Preview 9 of soroban-cli doesn't take contractId as hex strings anymore
//      you need to convert them to strkey addresses

const sorobanClient = require('soroban-client');


// Get commandline arguments
const args = process.argv[2];

const encodedContractId = sorobanClient.StrKey.encodeContract(Buffer.from(args, "hex"));
console.log(encodedContractId);
const decodedContractId = sorobanClient.StrKey.decodeContract(encodedContractId).toString("hex");
console.log(decodedContractId);

