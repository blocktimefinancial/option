Initial deploy - JUNK
CCHVUNHQKA6ZFQZIT6NT4WLHJDWXAMLC6ZCN5755SH35YRWRS3UKCFFS

Next iteration - WORKING with Preview 10
CBYGZ4AUPMKQSAQO2OENOX6IXV73MFWZHLDYENFRNSM3AAG2GA6C7AAE

soroban contract deploy --wasm target/wasm32-unknown-unknown/release/soroban_testsc.wasm --source SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL --rpc-url https://rpc-futurenet.stellar.org:443 --network-passphrase 'Test SDF Future Network ; October 2022'

soroban contract invoke --id CBYGZ4AUPMKQSAQO2OENOX6IXV73MFWZHLDYENFRNSM3AAG2GA6C7AAE --source SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL --rpc-url https://rpc-futurenet.stellar.org:443 --network-passphrase 'Test SDF Future Network ; October 2022' -- symboltest --s Hello

