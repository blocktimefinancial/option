// Deconstructing the result of an InvokeHostFunction operation
const SorobanClient = require("soroban-client");
const BigNumber = require("bignumber.js");

const xdr = SorobanClient.xdr;

envelopeXdr =
  "AAAAAgAAAADzwQ11keCAXiGbzzenrJCF67uR4i8TRh6rq10fRyygkwAAAGQAACitAAAA9wAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAACAAAADQAAACDNDKL3Idkd8zS3n7HgQ5IJGe0Mawn5MK9QSKUJMPt/RAAAAA8AAAAIcmV0cmlldmUAAAAEAAAABs0Movch2R3zNLefseBDkgkZ7QxrCfkwr1BIpQkw+39EAAAAEAAAAAEAAAABAAAADwAAAARJbml0AAAABs0Movch2R3zNLefseBDkgkZ7QxrCfkwr1BIpQkw+39EAAAAEAAAAAEAAAABAAAADwAAAAVRdW90ZQAAAAAAAAbNDKL3Idkd8zS3n7HgQ5IJGe0Mawn5MK9QSKUJMPt/RAAAABQAAAAH4xy/y1MqxGa+uH+BcqcEUeS6hAyGkKvE44Sj4LZdaIcAAAAAAAAAAAAAAAAAAAABRyygkwAAAEC6aE5+RGDuYyAb4o0EajVyFIfde+X8BKNH7NTh+T+I5kWJ6YBviUPxhz5kA54nRseqzi+NBy26T+WY3Gu5G/UM";
resultXdr =
  "AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAAYAAAAAAAAABAAAAABAAAABAAAAAoAAAAAAAAAAQAAAAAAAAAAAAAACgAAAAD0ejZQAAAAAAAAAAAAAAAKAAABh3FP7GAAAAAAAAAAAAAAAAoAAAAAAAAABAAAAAAAAAAAAAAAAA==";
resultMetaXdr =
  "AAAAAwAAAAIAAAADAAGz5AAAAAAAAAAA88ENdZHggF4hm883p6yQheu7keIvE0Yeq6tdH0csoJMAAAAXSHaHhAAAKK0AAAD2AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAwAAAAAAAbPaAAAAAGQ1lYEAAAAAAAAAAQABs+QAAAAAAAAAAPPBDXWR4IBeIZvPN6eskIXru5HiLxNGHqurXR9HLKCTAAAAF0h2h4QAACitAAAA9wAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAMAAAAAAAGz5AAAAABkNZW3AAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAGQAAAAAAAAAAQAAAAAAAAAYAAAAAAAAABAAAAABAAAABAAAAAoAAAAAAAAAAQAAAAAAAAAAAAAACgAAAAD0ejZQAAAAAAAAAAAAAAAKAAABh3FP7GAAAAAAAAAAAAAAAAoAAAAAAAAABAAAAAAAAAAAAAAAAJsfp50tuTmgaX5D+1ynll+uHTfhyZ2BW45Bh0Zw0iofy7xIdQ3ruFNQk7Per4isf0z/h0JVdqWN4rrHVKzbRhYGbt5QGKy0zZdnNkPRGZxOZ4ep9K4lAXYOLatKiWJtAAAAAAA=";

let result = xdr.TransactionResult.fromXDR(resultXdr, "base64");
let resultMeta = xdr.TransactionMeta.fromXDR(resultMetaXdr, "base64");

console.dir(
  result
    .result()
    .results()[0]
    .tr()
    .invokeHostFunctionResult()
    .success()
    .vec()[0]
    .switch().name
);
console.dir(
  result
    .result()
    .results()[0]
    .tr()
    .invokeHostFunctionResult()
    .success()
    .vec()[0]
    .value()
);

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

for (let i = 0; i < result.result().results()[0].tr().invokeHostFunctionResult().success().vec().length; i++) {
  const v1 = xdr.ScVal.scvI128(
    result
      .result()
      .results()
      [0].tr()
      .invokeHostFunctionResult()
      .success()
      .vec()[i]
      .value()
  );
  console.log(scvalToBigNumber(v1).toString());
}
