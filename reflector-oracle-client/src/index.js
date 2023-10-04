const {
    Server,
    Contract,
    TransactionBuilder,
    Address,
    xdr,
    Transaction,
    Memo,
    Keypair,
    scValToBigInt,
    nativeToScVal,
    BASE_FEE,
    Networks
} = require('soroban-client')
const AssetType = require('./asset-type')

/**
 * @typedef {import('soroban-client').Account} Account
 */

/**
 * @typedef {Object} Asset
 * @property {AssetType} type - Asset type
 * @property {string} code - Asset code
 */

/**
 * @typedef {Object} Price
 * @property {BigInt} price - Price
 * @property {BigInt} timestamp - Timestamp
 */

/**
 * @typedef {Object} Config
 * @property {string} admin - Valid Stellar account ID
 * @property {Asset[]} assets - Array of assets
 * @property {number} period - Redeem period in milliseconds
 */

/**
 * @typedef {Object} TxOptions
 * @property {number} fee - Transaction fee in stroops
 * @property {number} timeout - Transaction timeout in seconds. Set to 0 to avoid different transactions for multisig accounts. Default is 0.
 * @property {string} memo - Transaction memo
 * @property {{min: number | Data, max: number | Date}} timebounds - Transaction timebounds
 * @property {string[]} signers - Transaction signers
 * @property {string} minAccountSequence - Minimum account sequence
 */

/**
 * @typedef {import('soroban-client').SorobanRpc.GetTransactionResponse} TransactionResponse
 */

/**
 * @param {OracleClient} client - Oracle client instance
 * @param {string|Account} source - Valid Stellar account ID, or Account object
 * @param {xdr.Operation} operation - Stellar operation
 * @param {TxOptions} options - Transaction options
 * @param {string} network - Stellar network
 * @returns {Promise<Transaction>}
 */
async function buildTransaction(client, source, operation, options, network) {
    let sourceAccount = source

    if (typeof source !== 'object')
        sourceAccount = await client.server.getAccount(source)

    const txBuilderOptions =JSON.parse(JSON.stringify(options))
    txBuilderOptions.memo = options.memo ? Memo.text(options.memo) : null
    txBuilderOptions.networkPassphrase = network
    console.log(txBuilderOptions)
    console.log(source)

    const transaction = new TransactionBuilder(sourceAccount, txBuilderOptions)
        .addOperation(operation)
        .setTimeout(options.timeout || 0)
        .build()

    return await client.server.prepareTransaction(transaction, client.network)
}

function getAccountId(source) {
    if (typeof source === 'object') {
        return source.accountId()
    }
    return source
}

/**
 * @param {Asset} asset - Asset object
 * @returns {xdr.ScVal}
 */
function buildAssetScVal(asset) {
    switch (asset.type) {
        case AssetType.Stellar:
            return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Stellar'), new Address(asset.code).toScVal()])
        case AssetType.Generic:
            return xdr.ScVal.scvVec([xdr.ScVal.scvSymbol('Generic'), xdr.ScVal.scvSymbol(asset.code)])
        default:
            throw new Error('Invalid asset type')
    }
}

/**
 * @param {any} result - XDR result meta
 * @returns {*}
 */
function getSorobanResultValue(result) {
    const value = result.value().sorobanMeta().returnValue()
    if (value.value() === false) //if footprint's data is different from the contract execution data, the result is false
        return undefined
    return value
}

/**
 * @param {any} xdrAssetResult - XDR asset result
 * @returns {Asset}
 */
function parseXdrAssetResult(xdrAssetResult) {
    const xdrAsset = xdrAssetResult.value()
    const assetType = xdrAsset[0].value().toString()
    switch (AssetType[assetType]) {
        case AssetType.Generic:
            return {type: AssetType.Generic, code: xdrAsset[1].value().toString()}
        case AssetType.Stellar:
            return {type: AssetType.Stellar, code: Address.contract(xdrAsset[1].value().value()).toString()}
        default:
            throw new Error(`Unknown asset type: ${assetType}`)
    }
}

/**
 * @param {any} xdrPriceResult - XDR price result
 * @returns {{price: BigInt, timestamp: BigInt}}
 */
function parseXdrPriceResult(xdrPriceResult) {
    const xdrPrice = xdrPriceResult.value()
    return {
        price: scValToBigInt(xdrPrice[0].val()),
        timestamp: scValToBigInt(xdrPrice[1].val())
    }
}

class OracleClient {

    /**
     * @type {string}
     * @description Valid Stellar contract ID
     */
    contractId

    /**
     * @type {Contract}
     * @description Stellar contract instance
     */
    contract

    /**
     * @type {string}
     * @description Stellar network passphrase
     */
    network

    /**
     * @type {string}
     * @description Horizon URL
     */
    horizonUrl

    /**
     * @type {Server}
     * @description Horizon server instance
     */
    server

    constructor(network, horizonUrl, contractId) {
        this.contractId = contractId
        this.contract = new Contract(contractId)
        this.network = network
        this.horizonUrl = horizonUrl
        this.server = new Server(horizonUrl, {allowHttp: true})
    }

    /**
     * Builds a transaction to configure the oracle contract
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Config} config - Configuration object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async config(source, config, options = {fee: 100}) {
        const configScVal = xdr.ScVal.scvMap([
            new xdr.ScMapEntry({key: xdr.ScVal.scvSymbol('admin'), val: new Address(config.admin).toScVal()}),
            new xdr.ScMapEntry({
                key: xdr.ScVal.scvSymbol('assets'),
                val: xdr.ScVal.scvVec(config.assets.map(asset => buildAssetScVal(asset)))
            }),
            new xdr.ScMapEntry({
                key: xdr.ScVal.scvSymbol('period'),
                val: xdr.ScVal.scvU64(xdr.Uint64.fromString(config.period.toString()))
            })
        ])
        return await buildTransaction(
            this,
            source,
            this.contract.call('config', new Address(getAccountId(source)).toScVal(), configScVal),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to bump contract instance storage
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {number} ledgersToLive - Number of ledgers to live
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async bump(source, ledgersToLive, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'bump',
                xdr.ScVal.scvU32(ledgersToLive)
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to register assets
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset[]} assets - Array of assets
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async addAssets(source, assets, options = {fee: 100}) {
        return await buildTransaction(this,
            source,
            this.contract.call(
                'add_assets',
                new Address(getAccountId(source)).toScVal(),
                xdr.ScVal.scvVec(assets.map(asset => buildAssetScVal(asset)))
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to update period
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {number} period - Redeem period in milliseconds
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async setPeriod(source, period, options = {fee: 100}) {
        return await buildTransaction(this,
            source,
            this.contract.call(
                'set_period',
                new Address(getAccountId(source)).toScVal(),
                xdr.ScVal.scvU64(xdr.Uint64.fromString(period.toString()))
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to set prices
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {BigInt[]} updates - Array of prices
     * @param {number} timestamp - Timestamp in milliseconds
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async setPrice(source, updates, timestamp, options = {fee: 100}) {
        const scValPrices = xdr.ScVal.scvVec(updates.map(u => nativeToScVal(u, {type: 'i128'})))
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'set_price',
                new Address(getAccountId(source)).toScVal(),
                scValPrices,
                xdr.ScVal.scvU64(xdr.Uint64.fromString(timestamp.toString()))
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get admin
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async admin(source, options = {fee: 100}) {
        return await buildTransaction(this, source, this.contract.call('admin'), options, this.network)
    }

    /**
     * Builds a transaction to get base asset
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async base(source, options = {fee: 100}) {
        return await buildTransaction(this, source, this.contract.call('base'), options, this.network)
    }

    /**
     * Builds a transaction to get decimals
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async decimals(source, options = {fee: 100}) {
        return await buildTransaction(this, source, this.contract.call('decimals'), options, this.network)
    }

    /**
     * Builds a transaction to get resolution
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async resolution(source, options = {fee: 100}) {
        return await buildTransaction(this, source, this.contract.call('resolution'), options, this.network)
    }

    /**
     * Builds a transaction to get retention period
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async period(source, options = {fee: 100}) {
        return await buildTransaction(this, source, this.contract.call('period'), options, this.network)
    }

    /**
     * Builds a transaction to get supported assets
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async assets(source, options = {fee: 100}) {
        return await buildTransaction(this, source, this.contract.call('assets'), options, this.network)
    }

    /**
     * Builds a transaction to get last timestamp
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async lastTimestamp(source, options = {fee: 100}) {
        return await buildTransaction(this, source, this.contract.call('last_timestamp'), options, this.network)
    }

    /**
     * Builds a transaction to get asset price at timestamp
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} asset - Asset to get price for
     * @param {number} timestamp - Timestamp in milliseconds
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async price(source, asset, timestamp, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'price',
                buildAssetScVal(asset),
                xdr.ScVal.scvU64(xdr.Uint64.fromString(timestamp.toString()))
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get cross asset price at timestamp
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} baseAsset - Base asset
     * @param {Asset} quoteAsset - Quote asset
     * @param {number} timestamp - Timestamp in milliseconds
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async xPrice(source, baseAsset, quoteAsset, timestamp, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'x_price',
                buildAssetScVal(baseAsset),
                buildAssetScVal(quoteAsset),
                xdr.ScVal.scvU64(xdr.Uint64.fromString(timestamp.toString()))
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get last asset price
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} asset - Asset to get price for
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async lastPrice(source, asset, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call('lastprice', buildAssetScVal(asset)),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get last cross asset price
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} baseAsset - Base asset
     * @param {Asset} quoteAsset - Quote asset
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async xLastPrice(source, baseAsset, quoteAsset, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'x_last_price',
                buildAssetScVal(baseAsset),
                buildAssetScVal(quoteAsset)
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get last asset price records
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} asset - Asset to get prices for
     * @param {number} records - Number of records to return
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async prices(source, asset, records, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'prices',
                buildAssetScVal(asset),
                xdr.ScVal.scvU32(records)
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get last cross asset price records
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} baseAsset - Base asset
     * @param {Asset} quoteAsset - Quote asset
     * @param {number} records - Number of records to return
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async xPrices(source, baseAsset, quoteAsset, records, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'x_prices',
                buildAssetScVal(baseAsset),
                buildAssetScVal(quoteAsset),
                xdr.ScVal.scvU32(records)
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get asset price records in a period
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} asset - Asset to get prices for
     * @param {number} records - Number of records to return
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async twap(source, asset, records, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'twap',
                buildAssetScVal(asset),
                xdr.ScVal.scvU32(records)
            ),
            options,
            this.network
        )
    }

    /**
     * Builds a transaction to get last cross asset price in a period
     * @param {string|Account} source - Valid Stellar account ID, or Account object
     * @param {Asset} baseAsset - Base asset
     * @param {Asset} quoteAsset - Quote asset
     * @param {number} records - Number of records to return
     * @param {TxOptions} options - Transaction options
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async xTwap(source, baseAsset, quoteAsset, records, options = {fee: 100}) {
        return await buildTransaction(
            this,
            source,
            this.contract.call(
                'x_twap',
                buildAssetScVal(baseAsset),
                buildAssetScVal(quoteAsset),
                xdr.ScVal.scvU32(records)
            ),
            options,
            this.network
        )
    }

    /**
     * @param {Transaction} transaction - Transaction to submit
     * @param {xdr.DecoratedSignature[]} signatures - Signatures
     * @returns {Promise<TransactionResponse>} Transaction response
     */
    async submitTransaction(transaction, signatures = []) {
        const txXdr = transaction.toXDR() //Get the raw XDR for the transaction to avoid modifying the transaction object
        const tx = new Transaction(txXdr, this.network) //Create a new transaction object from the XDR
        signatures.forEach(signature => tx.addDecoratedSignature(signature))

        const submitResult = await this.server.sendTransaction(tx)
        if (submitResult.status !== 'PENDING') {
            const error = new Error(`Transaction submit failed: ${submitResult.status}`)
            error.status = submitResult.status
            error.errorResultXdr = submitResult.errorResultXdr
            error.hash = submitResult.hash
            throw error
        }
        const hash = submitResult.hash
        let response = await this.getTransaction(hash)
        while (response.status === 'PENDING' || response.status === 'NOT_FOUND') {
            response = await this.getTransaction(hash)
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        response.hash = hash //Add hash to response to avoid return new object
        if (response.status === 'FAILED') {
            const error = new Error(`Transaction submit failed, result: ${response.status}`)
            error.status = response.status
            error.hash = response.hash
            error.envelopeXdr = response.envelopeXdr
            error.resultXdr = response.resultXdr
            error.resultMetaXdr = response.resultMetaXdr

        }
        return response
    }

    /**
     * @param {string} hash - Transaction hash
     * @returns {Promise<TransactionResponse>} - Transaction response
     */
    async getTransaction(hash) {
        return await this.server.getTransaction(hash)
    }

    /**
     * @param {string} result - Trasanction meta XDR
     * @returns {string} - Keypair public key
     */
    static parseAdminResult(result) {
        const adminBuffer = getSorobanResultValue(result)?.value()?.value()?.value()
        if (adminBuffer === undefined)
            return null
        const adminPublicKey = new Keypair({type: 'ed25519', publicKey: adminBuffer})
        return adminPublicKey.publicKey()
    }

    /**
     * @param {string} result - Trasanction meta XDR
     * @returns {Asset} - Asset object
     */
    static parseBaseResult(result) {
        const val = getSorobanResultValue(result)
        if (val === undefined)
            return null
        return parseXdrAssetResult(val)
    }

    /**
     * @param {string} result - Trasanction meta XDR
     * @returns {number} - Number value
     */
    static parseNumberResult(result) {
        const val = getSorobanResultValue(result)
        if (val === undefined)
            return null
        return Number(val.value())
    }

    /**
     * @param {string} result - Trasanction meta XDR
     * @returns {Asset[]} - Array of asset objects
     */
    static parseAssetsResult(result) {
        const val = getSorobanResultValue(result)
        if (val === undefined)
            return null
        const assets = []
        for (const assetResult of val.value())
            assets.push(parseXdrAssetResult(assetResult))
        return assets
    }

    /**
     * @param {string} result - Trasanction meta XDR
     * @returns {Price} - Price object
     */
    static parsePriceResult(result) {
        const val = getSorobanResultValue(result)
        if (val === undefined)
            return null
        return parseXdrPriceResult(val)
    }

    /**
     * @param {string} result - Trasanction meta XDR
     * @returns {Price[]} - Array of price objects
     */
    static parsePricesResult(result) {
        const val = getSorobanResultValue(result)
        if (val === undefined)
            return null
        const prices = []
        for (const priceResult of val.value())
            prices.push(parseXdrPriceResult(priceResult))
        return prices
    }

    /**
     * @param {string} result - Trasanction meta XDR
     * @returns {BigInt} - twap value
     */
    static parseTwapResult(result) {
        const val = getSorobanResultValue(result)
        if (val === undefined)
            return null
        return scValToBigInt(val)
    }
}

module.exports = OracleClient