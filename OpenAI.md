## How we're using OpenAI and ChatGPT
We're experimenting with OpenAI's API to integrate our Soroban Smart Option Contract
into the BTF Platform.  It's fun and a work in progress.  Here are some of the things we
asked ChatGPT to do for us as an example:

I am a highly intelligent javascript software engineer and am versed in the MERN stack.  I can write CRUD operations using the mongoose package. 
Here is my smart contract schema
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var sbContractsSchema = new Schema({
  jsonrpcVersion: { type: String, default: "2.0" },
  contractId: String,
  name: String,
  description: String,
  wasm: String,
  wasmFileName: String,
  washHash: String,
  footprint: String,
  bindings: String,
  bindingsFileName: String,
  version: String,
  buildTools: String,
  admin: String,
  buildAt: {type: Date, default: Date.now},
  authorId: { type: mongoose.ObjectId, ref: "UserProfiles2", default: null },   
  builderId: { type: mongoose.ObjectId, ref: "UserProfiles2", default: null },
  methods: [String],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

1) Write the CRUD operations using javascript and mongoose for the smart contract schema.
2) Write the JSON Schema Form for the smart contract schema
3) Write the JSON Schema Form UI for the smart contract schema
4) Write the JSON Schema Form default data object for the smart contract schema

