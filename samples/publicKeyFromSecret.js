const sorobanClient = require('soroban-client');

console.log("Public Key from Secret");
console.log("Usage: node publicKeyFromSecret.js <secret>");
console.log("Purpose: Convert a secret to a public key");

// Get commandline arguments
const args = process.argv[2];

console.log(sorobanClient.Keypair.fromSecret(args).publicKey());