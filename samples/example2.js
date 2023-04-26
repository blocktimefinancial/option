// Deconstructing the result of an InvokeHostFunction operation
const SorobanClient = require("soroban-client");
const BigNumber = require("bignumber.js");
const util = require("util");

const xdr = SorobanClient.xdr;

envelopeXdr =
  "AAAAAgAAAADzwQ11keCAXiGbzzenrJCF67uR4i8TRh6rq10fRyygkwAAAGQAACitAAAA9wAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAACAAAADQAAACDNDKL3Idkd8zS3n7HgQ5IJGe0Mawn5MK9QSKUJMPt/RAAAAA8AAAAIcmV0cmlldmUAAAAEAAAABs0Movch2R3zNLefseBDkgkZ7QxrCfkwr1BIpQkw+39EAAAAEAAAAAEAAAABAAAADwAAAARJbml0AAAABs0Movch2R3zNLefseBDkgkZ7QxrCfkwr1BIpQkw+39EAAAAEAAAAAEAAAABAAAADwAAAAVRdW90ZQAAAAAAAAbNDKL3Idkd8zS3n7HgQ5IJGe0Mawn5MK9QSKUJMPt/RAAAABQAAAAH4xy/y1MqxGa+uH+BcqcEUeS6hAyGkKvE44Sj4LZdaIcAAAAAAAAAAAAAAAAAAAABRyygkwAAAEC6aE5+RGDuYyAb4o0EajVyFIfde+X8BKNH7NTh+T+I5kWJ6YBviUPxhz5kA54nRseqzi+NBy26T+WY3Gu5G/UM";
resultXdr =
  "AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAAYAAAAAAAAABAAAAABAAAABAAAAAoAAAAAAAAAAQAAAAAAAAAAAAAACgAAAAD0ejZQAAAAAAAAAAAAAAAKAAABh3FP7GAAAAAAAAAAAAAAAAoAAAAAAAAABAAAAAAAAAAAAAAAAA==";
resultMetaXdr =
  "AAAAAwAAAAIAAAADAAGz5AAAAAAAAAAA88ENdZHggF4hm883p6yQheu7keIvE0Yeq6tdH0csoJMAAAAXSHaHhAAAKK0AAAD2AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAwAAAAAAAbPaAAAAAGQ1lYEAAAAAAAAAAQABs+QAAAAAAAAAAPPBDXWR4IBeIZvPN6eskIXru5HiLxNGHqurXR9HLKCTAAAAF0h2h4QAACitAAAA9wAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAMAAAAAAAGz5AAAAABkNZW3AAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAGQAAAAAAAAAAQAAAAAAAAAYAAAAAAAAABAAAAABAAAABAAAAAoAAAAAAAAAAQAAAAAAAAAAAAAACgAAAAD0ejZQAAAAAAAAAAAAAAAKAAABh3FP7GAAAAAAAAAAAAAAAAoAAAAAAAAABAAAAAAAAAAAAAAAAJsfp50tuTmgaX5D+1ynll+uHTfhyZ2BW45Bh0Zw0iofy7xIdQ3ruFNQk7Per4isf0z/h0JVdqWN4rrHVKzbRhYGbt5QGKy0zZdnNkPRGZxOZ4ep9K4lAXYOLatKiWJtAAAAAAA=";
let fp2 = "AAAAAQAAAAfjHL/LUyrEZr64f4FypwRR5LqEDIaQq8TjhKPgtl1ohwAAAAEAAAAG1Mt6IMjX83OQscWpDag8fqf6PISSeYmlPj283WC8qREAAAAU";
let fp3 = "AAAAAAAAAAEAAAAH4xy/y1MqxGa+uH+BcqcEUeS6hAyGkKvE44Sj4LZdaIc=";

console.log(`footprint3: ${util.inspect(footprint3, false, 5)}`);
const footprint3 = xdr.LedgerFootprint.fromXDR(fp3, "base64");
console.log(`footprint3.switch().name: ${footprint3._attributes.readWrite[0]._value._attributes.hash.toString('hex')}`);
// const contractId = footprint._attributes.readWrite[0]._value._attributes.contractId.toString('hex')
const footPrint = xdr.LedgerFootprint.fromXDR("AAAAAQAAAAfjHL/LUyrEZr64f4FypwRR5LqEDIaQq8TjhKPgtl1ohwAAAAEAAAAG1Mt6IMjX83OQscWpDag8fqf6PISSeYmlPj283WC8qREAAAAU", 'base64');
// console.log(`footPrint: ${util.inspect(footPrint, false, 5)}`);
// console.log(`footPrint.attributes: ${util.inspect(footPrint._attributes, false, 5)}`);
// //console.log(`lfp: ${util.inspect(lfp, false, 5)}`);
//console.log(`ContractId: ${ footPrint._attributes.readWrite[0]._value._attributes.contractId.toString('hex')}`);

  // Data from the transaction
const cId = "cd0ca2f721d91df334b79fb1e043920919ed0c6b09f930af5048a50930fb7f44";
const paramscId = "AAAADQAAACDNDKL3Idkd8zS3n7HgQ5IJGe0Mawn5MK9QSKUJMPt/RA==";
const fp =
  "AAAABAAAAAbNDKL3Idkd8zS3n7HgQ5IJGe0Mawn5MK9QSKUJMPt/RAAAABAAAAABAAAAAQAAAA8AAAAESW5pdAAAAAbNDKL3Idkd8zS3n7HgQ5IJGe0Mawn5MK9QSKUJMPt/RAAAABAAAAABAAAAAQAAAA8AAAAKUHhQdW1wVXNlcgAAAAAABs0Movch2R3zNLefseBDkgkZ7QxrCfkwr1BIpQkw+39EAAAAFAAAAAfjHL/LUyrEZr64f4FypwRR5LqEDIaQq8TjhKPgtl1ohwAAAAEAAAAGzQyi9yHZHfM0t5+x4EOSCRntDGsJ+TCvUEilCTD7f0QAAAAQAAAAAQAAAAEAAAAPAAAABVF1b3RlAAAA";

  const c1 = new SorobanClient.Contract(Buffer.from(cId, "hex"));
  //const c2 = new xdr.ContractId().fromXDR(Buffer.from(cId, "hex")).toXDR('base64');
  //console.log(`cId: ${c1.toScVal('base64')}`);

  // let p1 = Buffer.from(paramscId, "base64");
  // let p2 = new xdr.ScVal.scvBytes(p1).value().toString('hex').slice(-64);
  // console.dir(p2);
  // console.log(`params: ${util.inspect(p1.toString('hex'))}`);
 // console.log(`params: ${util.inspect(xdr.ScVal.scvAddress(xdrparamscId))}`);
let result = xdr.TransactionResult.fromXDR(resultXdr, "base64");
let resultMeta = xdr.TransactionMeta.fromXDR(resultMetaXdr, "base64");

function scvalToString(value) {
  return value.bytes().toString();
}

// console.dir(
//   result
//     .result()
//     .results()[0]
//     .tr()
//     .invokeHostFunctionResult()
//     .success()
//     .vec()[0]
//     .switch().name
// );
// console.dir(
//   result
//     .result()
//     .results()[0]
//     .tr()
//     .invokeHostFunctionResult()
//     .success()
//     .vec()[0]
//     .value()
// );

// From Paul and Esteban
function scvalToBigNumber(scval) {
  switch (scval?.switch()) {
    case undefined: {
      return BigNumber(0);
    }
    case xdr.ScValType.scvU32(): {
      return BigNumber(scval.u32());
    }
    case xdr.ScValType.scvI32(): {
      return BigNumber(scval.i32());
    }
    case xdr.ScValType.scvU64(): {
      const { high, low } = scval.u64();
      return bigNumberFromBytes(false, high, low);
    }
    case xdr.ScValType.scvI64(): {
      const { high, low } = scval.i64();
      return bigNumberFromBytes(true, high, low);
    }
    case xdr.ScValType.scvU128(): {
      const parts = scval.u128();
      const a = parts.hi();
      const b = parts.lo();
      return bigNumberFromBytes(false, a.high, a.low, b.high, b.low);
    }
    case xdr.ScValType.scvI128(): {
      const parts = scval.i128();
      const a = parts.hi();
      const b = parts.lo();

      let aHighPadded = Buffer.alloc(4);
      let aHigh = bigintToBuf(a.high);
      aHigh.copy(aHighPadded, aHighPadded.length - aHigh.length);
      let aLowPadded = Buffer.alloc(4);
      let aLow = bigintToBuf(a.low);
      aLow.copy(aLowPadded, aLowPadded.length - aLow.length);
      let bHighPadded = Buffer.alloc(4);
      let bHigh = bigintToBuf(b.high);
      bHigh.copy(bHighPadded, bHighPadded.length - bHigh.length);
      let bLowPadded = Buffer.alloc(4);
      let bLow = bigintToBuf(b.low);
      bLow.copy(bLowPadded, bLowPadded.length - bLow.length);
      let bigBuf = Buffer.concat(
        [aHighPadded, aLowPadded, bHighPadded, bLowPadded],
        16
      );

      return bigNumberFromBytes(true, ...bigBuf);
    }
    case xdr.ScValType.scvU256(): {
      return bigNumberFromBytes(false, ...scval.u256());
    }
    case xdr.ScValType.scvI256(): {
      return bigNumberFromBytes(true, ...scval.i256());
    }
    default: {
      throw new Error(
        `Invalid type for scvalToBigNumber: ${scval?.switch().name}`
      );
    }
  }
}

function bigNumberFromBytes(signed, ...bytes) {
  let sign = 1;

  console.log(`signed: ${signed} bytes: ${bytes}`);
  if (signed === true && bytes[0] === 0x80) {
    // top bit is set, negative number.
    sign = -1;
    console.log(`b[0]: ${bytes[0]}`);
    bytes[0] &= 0x7f;
    console.log(`b[0]: ${bytes[0]}`);
  }

  let b = BigInt(0);
  for (let byte of bytes) {
    b <<= BigInt(8);
    b |= BigInt(byte);
    console.log(`b: ${b.toString(10)}`);
  }
  return BigNumber(b.toString()).multipliedBy(sign);
}

function bigintToBuf(bn) {
  var hex = BigInt(bn).toString(16).replace(/^-/, "");
  console.log("bigintToBuf hex:", hex);
  if (hex.length % 2) {
    hex = "0" + hex;
  }

  var len = hex.length / 2;
  var u8 = new Uint8Array(len);

  var i = 0;
  var j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j + 2), 16);
    i += 1;
    j += 2;
  }

  if (bn < BigInt(0)) {
    // Set the top bit
    u8[0] |= 0x80;
  }

  return Buffer.from(u8);
}
// value: BigNumber
// returns: SorobanClient.xdr.ScVal
function bigNumberToI128(value) {
  const b = BigInt(value.toFixed(0));
  const buf = bigintToBuf(b);

  if (buf.length > 16) {
    throw new Error("BigNumber overflows i128");
  }

  if (value.isNegative()) {
    // Clear the top bit
    buf[0] &= 0x7f;
  }

  // left-pad with zeros up to 16 bytes
  let padded = Buffer.alloc(16);
  buf.copy(padded, padded.length - buf.length);

  if (value.isNegative()) {
    // Set the top bit
    padded[0] |= 0x80;
  }

  const hihi = bigNumberFromBytes(false, ...padded.slice(0, 4)).toNumber();
  const hilo = bigNumberFromBytes(false, ...padded.slice(4, 8)).toNumber();
  console.log("hihi", hihi);
  console.log("hilo", hilo);

  const hi = new xdr.Uint64(hilo, hihi);

  let lohi = bigNumberFromBytes(false, ...padded.slice(8, 12)).toNumber();
  let lolo = bigNumberFromBytes(false, ...padded.slice(12, 16)).toNumber();
  console.log("lohi", lohi);
  console.log("lolo", lolo);

  const lo = new xdr.Uint64(lolo, lohi);
  console.log("lo", util.inspect(lo, false, 5));

  const x = new xdr.Int128Parts({ lo, hi });

  console.log("x", util.inspect(x, false, 5));

  return new xdr.ScVal.scvI128(x);
}

// A ten digital number works
//const b1 = new BigNumber("1234567890");

// A twenty digital number does not work, pos or neg
// FIXME: Not working
// const b1 = new BigNumber("-12345678901234567");
// console.log("b1", util.inspect(b1, false, 5), b1.toString());
// const scv1 = bigNumberToI128(b1);
// console.log("scv1", util.inspect(scv1, false, 5), scvalToBigNumber(scv1));
// const b2 = scvalToBigNumber(scv1);
// console.log("b2", util.inspect(b2, false, 5), b2.toString());

//unwind();

function unwind() {
  for (
    let i = 0;
    i <
    result.result().results()[0].tr().invokeHostFunctionResult().success().vec()
      .length;
    i++
  ) {
    const v1 = xdr.ScVal.scvI128(
      result
        .result()
        .results()[0]
        .tr()
        .invokeHostFunctionResult()
        .success()
        .vec()
        [i].value()
    );
    console.log(util.inspect(v1, false, 5), scvalToBigNumber(v1).toString());
  }
}
