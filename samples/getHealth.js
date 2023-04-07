const SorobanClient = require("soroban-client");

const remoteServerUrl = "https://rpc-futurenet.stellar.org/";

const server = new SorobanClient.Server(remoteServerUrl);

async function getHealth() {
  const health = await server.getHealth();
  console.dir(health);
}

getHealth();