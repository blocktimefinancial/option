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

let result = xdr.TransactionResult.fromXDR(resultXdr, "base64");
let resultMeta = xdr.TransactionMeta.fromXDR(resultMetaXdr, "base64");

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
      return bigNumberFromBytes(true, a.high, a.low, b.high, b.low);
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
  if (signed && bytes[0] === 0x80) {
    // top bit is set, negative number.
    sign = -1;
    bytes[0] &= 0x7f;
  }
  let b = BigInt(0);
  for (let byte of bytes) {
    b <<= BigInt(8);
    b |= BigInt(byte);
  }
  return BigNumber(b.toString()).multipliedBy(sign);
}
function bigintToBuf(bn) {
    var hex = BigInt(bn).toString(16).replace(/^-/, "");
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
  
  function bigNumberFromBytes(signed, ...bytes) {
    let sign = 1;
    if (signed && bytes[0] === 0x80) {
      // top bit is set, negative number.
      sign = -1;
      bytes[0] &= 0x7f;
    }
    let b = BigInt(0);
    for (let byte of bytes) {
      b <<= BigInt(8);
      b |= BigInt(byte);
    }
    return new BigNumber(b.toString()).multipliedBy(sign);
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
  console.debug({ value: value.toString(), padded });

  if (value.isNegative()) {
    // Set the top bit
    padded[0] |= 0x80;
  }

  const hi = new xdr.Uint64(
    bigNumberFromBytes(false, ...padded.slice(4, 8)).toNumber(),
    bigNumberFromBytes(false, ...padded.slice(0, 4)).toNumber()
  );
  const lo = new xdr.Uint64(
    bigNumberFromBytes(false, ...padded.slice(12, 16)).toNumber(),
    bigNumberFromBytes(false, ...padded.slice(8, 12)).toNumber()
  );

  return xdr.ScVal.scvI128(new xdr.Int128Parts({ lo, hi }));
}

// FIXME: Not working
const b1 = new BigNumber(12345678901234567890n);
console.log("b1", util.inspect(b1, false, 5), b1.toString());
const a1 = bigNumberToI128(b1);
console.log("a1", util.inspect(a1, false, 5), scvalToBigNumber(a1).toString());
const a2 = scvalToBigNumber(a1);
console.log("a2", util.inspect(a2, false, 5), scvalToBigNumber(a2).toString());

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
