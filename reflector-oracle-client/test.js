/*eslint-disable no-undef */
const crypto = require('crypto')
const {exec} = require('child_process')
const {Keypair, Server, TransactionBuilder, Operation, Networks, BASE_FEE} = require('soroban-client')
const Client = require('./src')
const AssetType = require('./src/asset-type')
const contractConfig = require('./contract.config.json')

if (contractConfig.assets.length < 2)
    throw new Error('Need at least 2 assets to run tests')

const initAssetLength = 1

const server = new Server(contractConfig.horizonUrl)

const extraAsset = {type: AssetType.Generic, code: 'JPY'}

const assetToString = (asset) => !asset ? 'null' : `${asset.type}:${asset.code}`

const priceToString = (price) => !price ? 'null' : `{price: ${price.price.toString()}, timestamp: ${price.timestamp.toString()}}`


function normalize_timestamp(timestamp) {
    return Math.floor(timestamp / contractConfig.resolution) * contractConfig.resolution
}

const MAX_I128 = BigInt('170141183460469231731687303715884105727')
const ADJUSTED_MAX = MAX_I128 / (10n ** BigInt(contractConfig.decimals)) //divide by 10^14
let lastTimestamp = normalize_timestamp(Date.now())
let period = contractConfig.resolution * 10

let admin
let account
let nodesKeypairs
let contractId
/**
 * @type {Client}
 */
let client

function getMajority(totalSignersCount) {
    return Math.floor(totalSignersCount / 2) + 1
}

async function sendTransaction(server, tx) {
    let result = await server.sendTransaction(tx)
    const hash = result.hash
    while (result.status === 'PENDING' || result.status === 'NOT_FOUND') {
        await new Promise(resolve => setTimeout(resolve, 1000))
        result = await server.getTransaction(hash)
    }
    if (result.status !== 'SUCCESS') {
        throw new Error(`Tx failed: ${result}`)
    }
    return result
}

async function createAccount(publicKey) {
    return await server.requestAirdrop(publicKey, 'https://friendbot-futurenet.stellar.org')
}

async function prepare() {
    admin = Keypair.random()
    nodesKeypairs = Array.from({length: 5}, () => (Keypair.random()))

    async function deployContract() {
        const command = `soroban contract deploy --wasm ../reflector-oracle/target/wasm32-unknown-unknown/release/reflector_oracle.wasm --source ${admin.secret()} --rpc-url ${contractConfig.horizonUrl} --network-passphrase "${contractConfig.network}"`
        return await new Promise((resolve, reject) => {
            exec(command, (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`)
                    reject(error)
                    return
                }
                if (stderr) {
                    console.error(`stderr: ${stderr}`)
                    reject(new Error(stderr))
                    return
                }
                resolve(stdout.trim())
            })
        })
    }

    await createAccount(admin.publicKey())
    contractId = await deployContract()

    console.log(`Contract ID: ${contractId}`)

    account = await server.getAccount(admin.publicKey())

    async function updateAdminToMultiSigAccount() {
        const majorityCount = getMajority(nodesKeypairs.length)
        let txBuilder = new TransactionBuilder(account, {fee: 100, networkPassphrase: contractConfig.network})
        txBuilder = txBuilder
            .setTimeout(30000)
            .addOperation(
                Operation.setOptions({
                    masterWeight: 0,
                    lowThreshold: majorityCount,
                    medThreshold: majorityCount,
                    highThreshold: majorityCount
                })
            )

        for (const nodeKeypair of nodesKeypairs) {
            txBuilder = txBuilder.addOperation(
                Operation.setOptions({
                    signer: {
                        ed25519PublicKey: nodeKeypair.publicKey(),
                        weight: 1
                    }
                })
            )
        }

        const tx = txBuilder.build()

        tx.sign(admin)

        await sendTransaction(server, tx)
    }

    await updateAdminToMultiSigAccount()

    client = new Client(contractConfig.network, contractConfig.horizonUrl, contractId)
}

function generateRandomI128() {
    //Generate a random 128-bit number
    const buffer = crypto.randomBytes(16) //Generate 16 random bytes = 128 bits
    const hex = buffer.toString('hex') //Convert to hexadecimal
    let randomNum = BigInt('0x' + hex) //Convert hex to BigInt

    const MAX_RANGE = 2n ** 128n

    randomNum = (randomNum * ADJUSTED_MAX) / MAX_RANGE

    return randomNum
}

function signTransaction(transaction) {
    const shuffledSigners = nodesKeypairs.sort(() => 0.5 - Math.random())
    const selectedSigners = shuffledSigners.slice(0, getMajority(nodesKeypairs.length))
    const txHash = transaction.hash()
    const signatures = []
    // for (const signer of selectedSigners) {
    //     const signature = signer.signDecorated(txHash)
    //     signatures.push(signature)
    // }
    const signer = Keypair.fromSecret("SD44PHYKUTTVKOYQYACCLDUPSXTQ3KTRFEKITB52J6ZLJN7LMEJPTQZD")
    signatures.push(signer.signDecorated(txHash))
    return signatures
}

const txOptions = {
    minAccountSequence: '0',
    fee: 1000
}

// beforeAll(async () => {
//     await prepare()
// }, 3000000)

// test('config', async () => {
//     await submitTx(client.config(account, {
//         admin: admin.publicKey(),
//         assets: contractConfig.assets.slice(0, initAssetLength),
//         period
//     }, txOptions), response => {
//         expect(response).toBeDefined()
//     })
// }, 300000)

// test('bump', async () => {
//     await submitTx(client.bump(account, 500_000, txOptions), response => {
//         expect(response).toBeDefined()
//     })
// }, 300000)

// test('add_assets', async () => {
//     await submitTx(client.addAssets(account, contractConfig.assets.slice(initAssetLength), txOptions), response => {
//         expect(response).toBeDefined()
//     })
// }, 300000)

// test('set_period', async () => {
//     period += contractConfig.resolution
//     await submitTx(client.setPeriod(account, period, txOptions), response => {
//         expect(response).toBeDefined()
//     })

//     await submitTx(client.period(account, txOptions), response => {
//         const newPeriod = Client.parseNumberResult(response.resultMetaXdr)
//         expect(newPeriod).toBe(period)
//     })
// }, 300000)

// test('set_price', async () => {
//     for (let i = 0; i < 3; i++) {
//         const prices = Array.from({length: contractConfig.assets.length}, () => generateRandomI128())

//         const timestamp = lastTimestamp += contractConfig.resolution
//         await submitTx(client.setPrice(account, prices, timestamp, txOptions), response => {
//             expect(response).toBeDefined()
//         })
//     }
// }, 300000)

// test('set_price (extra price)', async () => {
//     contractConfig.assets.push(extraAsset)
//     for (let i = 0; i < 3; i++) {
//         const prices = Array.from({length: contractConfig.assets.length}, () => generateRandomI128())

//         const timestamp = lastTimestamp += contractConfig.resolution
        // await submitTx(client.setPrice(account, prices, timestamp, txOptions), response => {
//             expect(response).toBeDefined()
//         })
//     }
// }, 300000)

// test('add_asset (extra asset)', async () => {
//     await submitTx(client.addAssets(account, [extraAsset], txOptions), response => {
//         expect(response).toBeDefined()
//     })
// }, 300000)

// //TODO: add test for get_price for extra asset before adding it (must be null) and after adding it (must be valid price)

// test('admin', async () => {
//     await submitTx(client.admin(account, txOptions), response => {
//         const adminPublicKey = Client.parseAdminResult(response.resultMetaXdr)
//         expect(admin.publicKey()).toBe(adminPublicKey)
//         return `Admin: ${adminPublicKey}`
//     })
// }, 3000000)

// test('base', async () => {
//     await submitTx(client.base(account, txOptions), response => {
//         const base = Client.parseBaseResult(response.resultMetaXdr)
//         expect(base !== null && base !== undefined).toBe(true)
//         return `Base: ${assetToString(base)}`
//     })
// }, 3000000)


// test('decimals', async () => {
//     await submitTx(client.decimals(account, txOptions), response => {
//         const decimals = Client.parseNumberResult(response.resultMetaXdr)
//         expect(decimals).toBe(contractConfig.decimals)
//         return `Decimals: ${decimals}`
//     })
// }, 300000)

// test('resolution', async () => {
//     await submitTx(client.resolution(account, txOptions), response => {
//         const resolution = Client.parseNumberResult(response.resultMetaXdr)
//         expect(resolution).toBe(contractConfig.resolution / 1000) //in seconds
//         return `Resolution: ${resolution}`
//     })
// }, 300000)

// test('period', async () => {
//     await submitTx(client.period(account, txOptions), response => {
//         const periodValue = Client.parseNumberResult(response.resultMetaXdr)
//         expect(periodValue).toBe(period)
//         return `Period: ${periodValue}`
//     })
// }, 300000)

// test('assets', async () => {
//     await submitTx(client.assets(account, txOptions), response => {
//         const assets = Client.parseAssetsResult(response.resultMetaXdr)
//         expect(assets.length).toEqual(contractConfig.assets.length)
//         return `Assets: ${assets.map(a => assetToString(a)).join(', ')}`
//     })
// }, 300000)

// test('price', async () => {
//     await submitTx(client.price(account, contractConfig.assets[1], lastTimestamp, txOptions), response => {
//         const price = Client.parsePriceResult(response.resultMetaXdr)
//         expect(price).toBeDefined()
//         return `Price: ${priceToString(price)}`
//     })
// }, 300000)

// test('x_price', async () => {
//     await submitTx(client.xPrice(account, contractConfig.assets[0], contractConfig.assets[1], lastTimestamp, txOptions), response => {
//         const price = Client.parsePriceResult(response.resultMetaXdr)
//         expect(price).toBeDefined()
//         return `Price: ${priceToString(price)}`
//     })
// }, 300000)

// test('lastprice', async () => {
//     await submitTx(client.lastPrice(account, contractConfig.assets[0], txOptions), response => {
//         const price = Client.parsePriceResult(response.resultMetaXdr)
//         expect(price).toBeDefined()
//         return `Price: ${priceToString(price)}`
//     })
// }, 300000)

// test('x_lt_price', async () => {
//     await submitTx(client.xLastPrice(account, contractConfig.assets[0], contractConfig.assets[1], txOptions), response => {
//         const price = Client.parsePriceResult(response.resultMetaXdr)
//         expect(price).toBeDefined()
//         return `Price: ${priceToString(price)}`
//     })
// }, 300000)

// test('prices', async () => {
//     await submitTx(client.prices(account, contractConfig.assets[0], 3, txOptions), response => {
//         const prices = Client.parsePricesResult(response.resultMetaXdr)
//         expect(prices.length > 0).toBe(true)
//         return `Prices: ${prices.map(p => priceToString(p)).join(', ')}`
//     })
// }, 300000)

// test('x_prices', async () => {
//     await submitTx(client.xPrices(account, contractConfig.assets[0], contractConfig.assets[1], 3, txOptions), response => {
//         const prices = Client.parsePricesResult(response.resultMetaXdr)
//         expect(prices.length > 0).toBe(true)
//         return `Prices: ${prices.map(p => priceToString(p)).join(', ')}`
//     })
// }, 300000)

// test('twap', async () => {
//     await submitTx(client.twap(account, contractConfig.assets[0], 3, txOptions), response => {
//         const twap = Client.parseTwapResult(response.resultMetaXdr)
//         expect(twap > 0n).toBe(true)
//         return `Twap: ${twap.toString()}`
//     })
// }, 300000)

// test('x_twap', async () => {
//     await submitTx(client.xTwap(account, contractConfig.assets[0], contractConfig.assets[1], 3, txOptions), response => {
//         const twap = Client.parseTwapResult(response.resultMetaXdr)
//         expect(twap > 0n).toBe(true)
//         return `Twap: ${twap.toString()}`
//     })
// }, 300000)

// test('lasttimestamp', async () => {
//     await submitTx(client.lastTimestamp(account, txOptions), response => {
//         const timestamp = Client.parseNumberResult(response.resultMetaXdr)
//         expect(timestamp).toBeGreaterThan(0)
//         return `Timestamp: ${timestamp}`
//     })
// }, 300000)

async function submitTx(txPromise, processResponse) {
    const tx = await txPromise
    const signatures = signTransaction(tx)
    const response = await client.submitTransaction(tx, signatures)
    const additional = processResponse(response)

    console.log(`Transaction ID: ${response.hash}, Status: ${response.status}, ${additional || 'Success'}`)
}

async function main(){
    const contractCaller    = "GDTQQPHB622LVZ5QWPJ4YDHKYKGXNBRP5H24MI22WAZQVDPG3XWLJWUO"
    const client            = new Client(contractConfig.network, contractConfig.horizonUrl, "CBNV6JPWVI4QFRBYRJDRMB6RSNCNEMYPQAE4VI777HLYMN73ATLAMHTI")

    await prepare()

    // await submitTx(client.admin(contractCaller, txOptions), response => {
    //     const adminPublicKey = Client.parseAdminResult(response.resultMetaXdr)
    //     //expect(admin.publicKey()).toBe(adminPublicKey)
    //     console.log(`Admin: ${adminPublicKey}`)
    //     return `Admin: ${adminPublicKey}`
    // })
    // let assets = []
    // await submitTx(client.assets(contractCaller, txOptions), response => {
    //     assets = Client.parseAssetsResult(response.resultMetaXdr)
    //     return `Assets: ${JSON.stringify(assets)}`
    // })

    // console.log("Assets Retrieved. Starting price set...")

    for(let i = 0; i < 3; i++){
        const prices = Array.from({length: contractConfig.assets.length}, () => generateRandomI128())

        const timestamp = lastTimestamp += contractConfig.resolution
        await submitTx(client.setPrice(contractCaller, prices, timestamp, txOptions), response => {
        //expect(response).toBeDefined()
        })
    }
    
    console.log(`Getting last 3 prices for: ${JSON.stringify(contractConfig.assets[0])}`)
    await submitTx(client.prices(contractCaller, contractConfig.assets[0], 3, txOptions), response =>{
        const prices = Client.parsePricesResult(response.resultMetaXdr)
        console.log(prices)
        return `Prices: ${prices.map(p => priceToString(p)).join(', ')}`
    })
    
}

main();