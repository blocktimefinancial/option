## Asset Symbology
Asset codes or ticker symbols have long been a pain in the hiny.  There are many different
techniques for standardizing and normalizing them.  Option symbology was standardized by the 
OCC (Options Clearing Corp) into a format known as OSI (options Symbology Initiative) in 2010.
This replaced the old OPRA codes developed in the early 1970's.  The 21 charater format is:
The OCC option symbol consists of four parts:
1) Root symbol of the underlying stock or ETF, padded with spaces to 6 characters
2) Expiration date, 6 digits in the format yymmdd
3) Option type, either P or C, for put or call
4) Strike price, as the price x 1000, front padded with 0s to 8 digits
Detailed 
Root - 6 chars, left justified with spaces
Year - 2 chars, zero padded on the left
Month- 2 chars, zero padded on the left Jan = '01', Feb = '02',...Oct = '10'
Day -  2 chars, zero padded on the left, 1st = '01' tenth = '10', ...
C/P -  1 char, 'C' for call, 'P' for put
Dollar Strike - 5 chars, zero padded of the left, $47 = 00047
Decimal Strike - 3 chars, zero padded on the right, $0.01 = 010

#### Mini Options
Mini-options contracts trade under a different trading symbol than standard-sized options contracts. Mini-options carry the number "7" at the end of the security symbol. For example, the Apple mini-options symbol is AAPL7.

## Digital Asset Symbology
THe OCC's OSI model obviously doesn't work well with options on digital assets.  A new hybird format
will be needed.  We will be using the following format for Soroban until a new standard is developed.

Root - TokenId - the hex encoded tokenId that implements the Soroban token interface
Expiration - Unix Timestamp - the Unix timestamp in ms
OptionType - C,P,...  A 1 char code for option type, with more exotics TBD
Strike - I128 formatted with 7 implied decimal places, max strike = 17,014,118,3​46,046,923,173,168,7​30,371,5​88.4​105727

Root - 64 chars hax encoded tokenId
Expiration - 14 chars 33239962256000, will last until the year 5138 by which time this blockchain will be dead...???
OptionType - 1 char
Strike - 43 chars the largest signed int128 is 170141183​460469231731687​303715​884​105727

Total 122 chars
This should be a Soroban Symbol datatype which should plenty of room for free format symbols without convention
```
function toObject(symbol) {
    tokenClient = SorobanClient.tokenId(symbol.slice(0,63));
    const tokenName = tokenClient.name();
    const tokenSymbol = tokenClient.symbol();
    const expiration = symbol.slice(64,78).toNumber();
    const optionType = symbol.slice(79,79);
    const strike = BigNumber(symbol.slice(80));
    return { tokeName, tokenSymbol, expiration, optionType, strike };
}
```
```
function toSymbol(tokenId, expiration, optionType, strike) {
    let symbol = "";
    symbol += tokenId;
    symbol += expiration.toString();
    symbol += optionType;
    symbol += strike;
}
```