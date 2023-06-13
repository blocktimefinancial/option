# Option Settlement Smart Contract Project
Soroban Option Project for SCF#13 and #15

Our SCF#13 submission is a three-part project.
DISCLAIMER: This is a proof of concept project and should NOT be used in production!!
Please see our complete disclaimer below.

>**Project is current and locked to Preview 9**

The details of each piece of the project are described below.  We will be integrating
these as they mature into our BTF platform.  The platform itself is used by businesses
that are regulated and need regulatory and compliance reports, processes, and workflows.

Please see our website at [blocktimefinancial.com](https://blocktimefinancial.com) for more information and solutions.

## Option Smart Contract
Current ContractId: e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19

As StrKey: CDUUOYHANWRSQNX6RXGHDZ5THWYMKKL2RODO4LNQ4I7KLZQSGU5RSWB3
### USDC Token (Wrapped Stellar Classic Asset) used for collateral
Current ContractId: (SAC Token ID): a95bdc05cf685ab4379aca06e3acdb9dc7d7ac869e199d617d60b2a9ba067db5

As StrKey: CCUVXXAFZ5UFVNBXTLFANY5M3OO4PV5MQ2PBTHLBPVQLFKN2AZ63KERY

Contract Name: USDC:GBL74ETHLQJQUQW7YQT4KO3HJVR74TIHSBW6ENRBSFHUTATBRKKLGW4Y

Contract Symbol: USDC
#### What it does
The option smart contract is the "clearing corp" in this use case.  Option trades are submitted
to the smart contract.  Currently, the smart contract ONLY provides settlement services for 
option contracts and spreads that have limited risk.  It does NOT have any provisions for liquidation
based on risk.  In a nutshell, when two parties agree on an option trade, both sides can submit the trade
details to the smart contract along with the needed deposit for settlement.  Each party can then monitor the option
trade, and it is constantly "marked-to-market" via input from the pricing Oracle smart contract.
When the option expiry date has passed, each party may remove any remaining deposit based on the final 
settlement price from the oracle.  The token used for collateral is the USDC we issued on FutureNet.
To make it into a Soroban token, we used the SAC token contract to "wrap" the classic Stellar asset.
For instructions on how to do this, please see Esteblock's [Token Playground](https://token-playground.gitbook.io/guide/)

Cmd to initialize the option contract
```sh
soroban contract invoke --id e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19 --sourc
e SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL --rpc-url https://rpc-futurenet.stellar.org:443 --network-p
assphrase 'Test SDF Future Network ; October 2022' -- init
```

Cmd to list an option contract
```sh
soroban contract invoke --id e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19 --source SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL --rpc-url https://rpc-futurenet.stellar.org:443 --network-passphrase 'Test SDF Future Network ; October 2022' -- list --opt_type 10 --strike 100 --exp 168782113900 --oracle CDQ7O4YTO46Y4QUYG3AIBZKHBPP3FDZU6M4EPATWAGYMKQFM4EE37UL6 --token CCUVXXAFZ5UFVNBXTLFANY5M3OO4PV5MQ2PBTHLBPVQLFKN2AZ63KERY 
--admin GDZ4CDLVSHQIAXRBTPHTPJ5MSCC6XO4R4IXRGRQ6VOVV2H2HFSQJHRYH
```

Cmd to update the option contract from oracle
```sh
soroban contract invoke --id e94760e06da32836fe8dcc71e7b33db0c5297a8b86ee2db0e23ea5e612353b19 --source SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL --rpc-url https://rpc-futurenet.stellar.org:443 --network-passphrase 'Test SDF Future Network ; October 2022' -- upd_px
```

## Oracle Smart Contract
Current ContractId: e1f77313773d8e429836c080e5470bdfb28f34f33847827601b0c540ace109bf

As a StrKey: CDQ7O4YTO46Y4QUYG3AIBZKHBPP3FDZU6M4EPATWAGYMKQFM4EE37UL6

#### What it does
The Oracle smart contract acts as the source of truth for pricing.  Other smart contracts that trust
this oracle can query it for prices.  Its "truthy ness" is only based on the inputs and the trustworthiness
of the implementor. 

#### Soroban-CLI
Cmd to retrieve a price
```sh
soroban contract invoke --id e1f77313773d8e429836c080e5470bdfb28f34f33847827601b0c540ace109bf \
--rpc-url https://rpc-futurenet.stellar.org:443/ --network-passphrase 'Test SDF Future Network ; October 2022' \
--source SCIGOGUPFOZSEBVZBEF3BJL6SZGVSFYANQ6BZE6PTTQ7S4YXYDPY4JHL -- retrieve
```
##### Videos 
[Video Soroban-CLI Invoke Functions, Update, Retrieve](https://www.loom.com/share/934ae32d84624cfc83e120a5766cf60a)

[Video NodeJS Invoke Functions, Update, Retrieve](https://www.loom.com/share/10707c09005b4e1aaf3e11fd31fbf297)

## Price Pump Node JS App
This is a NodeJS application that gets inputs from public sources; in this sample, the yahoo-finance
pricing is used.  This is ONLY for testing purposes!!  In production, a real-time exchange feed should
be used for timely, accurate  data.  

*Starting the pxpump.js application is now updating the Oracle.*
#### What it does
Once every minute, the application queries the yahoo-finance interface for the SPRD(r) ETF SPY.
If the query is successful, it then calls the Oracle smart contract's update method with the new price
and any extra information that a smart contract might need. 
## Platform Integration
We're integrating the Soroban Smart Contract functionality into our platform.  The BTF Platform
provides web-based access to blockchain technology for regulated businesses such as Investment Banks,
Broker/Dealers, Banks, Credit Unions, and Law firms.  Here's a quick video on how we've started
the integration process.

##### Platform Integration Videos
[Soroban Video](https://www.loom.com/share/9a13bd19491b443f8c145040bca0d105)

[Soroban Smart Contract calls from BTF Platform](https://www.loom.com/share/ec6ffaaf9b5340bc85b8d005edf45900)

[SCF #13 Pitch Video](https://youtu.be/iUjGjVV6DVw)
[SCF #13 Slide Deck](https://www.canva.com/design/DAFhT7nGxr8/LcUwa4GXjQMr6T3Y8CseaQ/edit?utm_content=DAFhT7nGxr8&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)
## Who we are
Block Time Financial, Inc. is a blockchain infrastructure company.  We provide businesses with the technology to implement blockchain solutions in
a regulatory compliant manner.  We run parallel to your current systems, allowing you to experiment and explore the future of finance.
info@blocktimefinancial.com
(262) 368-1150
#### Disclaimer:
Please see the DISCLAIMER.md file in this repo
