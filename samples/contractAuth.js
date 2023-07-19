const SorobanClient = require("soroban-client");
const xdr = SorobanClient.xdr;

function ContractAuth(
  contractId,
  pk,
  functionName,
  nonce = "0",
  args = [],
  subInvocations = [],
  signatureArgs = []
) {
  return new SorobanClient.xdr.ContractAuth({
    addressWithNonce: AddressWithNonce(pk, nonce),
    rootInvocation: AuthorizedInvocation(contractId, functionName, args, subInvocations),
    signatureArgs: signatureArgs,
    signatureExpirationLedger: "0",
  });
}

function AddressWithNonce(pk, nonce = "0") {
  return new SorobanClient.xdr.AddressWithNonce({
    address: SorobanClient.xdr.ScAddress.scAddressTypeAccount(
      SorobanClient.xdr.PublicKey.publicKeyTypeEd25519(
        SorobanClient.StrKey.decodeEd25519PublicKey(pk)
      )
    ),
    nonce: SorobanClient.xdr.Uint64.fromString(nonce),
  });
}

function AuthorizedInvocation(contractId, functionName, args = [], subInvocations = []) {
  return new SorobanClient.xdr.AuthorizedInvocation({
    contractId: contractId,
    functionName: Buffer.from(functionName),
    args: args,
    subInvocations: subInvocations,
  });
}

function LedgerFootPrint(readOnly = [], readWrite = []) {
  return new SorobanClient.xdr.LedgerFootprint({
    readOnly: readOnly,
    readWrite: readWrite,
  });
}

function SorobanResource(
  readOnly = [],
  readWrite = [],
  instructions = 0,
  readBytes = 0,
  writeBytes = 0,
  extendedMetaDataSizeBytes = 0
) {
  return new SorobanClient.xdr.SorobanResource({
    footprint: LedgerFootPrint(readOnly, readWrite),
    instructions,
    readBytes,
    writeBytes,
    extendedMetaDataSizeBytes,
  });
}

function SorobanTransactionData( readOnly = [],
    readWrite = [],
    instructions = 0,
    readBytes = 0,
    writeBytes = 0,
    extendedMetaDataSizeBytes = 0, refundableFee = "0", extensionPoint = 0) {
    return new SorobanClient.xdr.SorobanTransactionData({
        resources: SorobanResource(readOnly, readWrite, instructions, readBytes, writeBytes, extendedMetaDataSizeBytes),
        refundableFee: SorobanClient.xdr.Int64.fromString(refundableFee),
        ext: new SorobanClient.xdr.ExtensionPoint(extensionPoint)
    });
}

module.exports.ContractAuth = ContractAuth;
module.exports.AddressWithNonce = AddressWithNonce;
module.exports.AuthorizedInvocation = AuthorizedInvocation;
module.exports.LedgerFootPrint = LedgerFootPrint;
module.exports.SorobanResource = SorobanResource;
module.exports.SorobanTransactionData = SorobanTransactionData;
