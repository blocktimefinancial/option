# Option Settlement Smart Contract Project
Soroban Option Project for SCF#13

Our SCF#13 submission is a three-part project.
DISCLAIMER: This is a proof of concept project and should NOT be used in production!!
Please see our complete disclaimer below.

The details of each piece of the project are described below.  We will be integrating
these as they mature into our BTF platform.  The platform itself is used by businesses
that are regulated and need regulatory and compliance reports, processes, and workflows.

Please see our website at [blocktimefinancial.com](https://blocktimefinancial.com) for more information and solutions.

## Option Smart Contract
Current ContractId: dfc5fe46e7a39887634c32f76f87f92d0b7d939d85c56c6dab14e4a51ba36678
Creation Transaction Hash: 1cd781d80fb55de42602611b4b3dd774e0ca8fc3c4e5061b09cfc58f9e80c6c0
Install WASM Transaction Hash: 9c0a38733f7f1f5514f660177b4946d74e8cc46a2c126196b5b22fe27fa1aac7

#### What it does
The option smart contract is the "clearing corp" in this use case.  Option trades are submitted
to the smart contract.  Currently, the smart contract ONLY provides settlement services for 
option contracts and spreads that have limited risk.  It does NOT have any provisions for liquidation
based on risk.  In a nutshell, when two parties agree on an option trade, both sides can submit to the
smart contract along with the needed deposit for settlement.  Each party can then monitor the option
trade, and it is constantly "marked-to-market" via input from the pricing Oracle smart contract.
When the option expiry date has passed, each party may remove any remaining deposit based on the final 
settlement price from the oracle.

## Oracle Smart Contract
Current ContractId: f99494aa0392e3da554155208e8e184d6f84eb02444070ea3bf3f2bc1aa96558
Creation Transaction Hash: 5f4518d455aab4451e6ecd0ccfbeb8e7a7e65ba99de543c5fae30cf24121dd6f
Install WASM Transaction Hash: 83a2fd36151972693ca93e6d149852aa3bcb4d242f97ca27dfaa6dd913e707f0

#### What it does
The Oracle smart contract acts as the source of truth for pricing.  Other smart contracts that trust
this oracle can query it for prices.  Its "truthy ness" is only based on the inputs and the trustworthiness
of the implementor. 
##### Videos 
[Video Soroban-CLI Invoke Functions, Update, Retrieve](https://www.loom.com/share/934ae32d84624cfc83e120a5766cf60a)

[Video NodeJS Invoke Functions, Update, Retrieve](https://www.loom.com/share/10707c09005b4e1aaf3e11fd31fbf297)

## Price Pump Node JS App
This is a NodeJS application that gets inputs from public sources; in this sample, the yahoo-finance
pricing is used.  This is ONLY for testing purposes!!  In production, a real-time exchange feed should
be used for timely, accurate  data.
#### What it does
Once every minute, the application queries the yahoo-finance interface for the SP500 cash index (SPX).
If the query is successful, it then calls the Oracle smart contract's update method with the new price
and any extra information that a smart contract might need. 
## Platform Integration
We're integrating the Soroban Smart Contract functionality into our platform.  The BTF Platform
provides web-based access to blockchain technology for regulated businesses such as Investment Banks,
Broker/Dealers, Banks, Credit Unions, and Law firms.  Here's a quick video on how we've started
the integration process.
[Soroban Video](https://www.loom.com/share/9a13bd19491b443f8c145040bca0d105)
#### Disclaimer:
Please see the DISCLAIMER.md file in this repo
