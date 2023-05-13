## The Option Smart Contract (SC)

#### Overview
The Option SC is the heart of this project.  It provides the trade and settlement service to a bi-lateral option trade.  This SC is limited to options and option spreads that have limited risk profiles.  It does not have the ability to adjust collateral due to market conditions.

#### SC Functions Provided

##### init
Initialize the Smart Contract

##### list_option
The list_option function can be called to "pre-list" the option contract.  This allows the trading parties to verify that they are both trading the same well known option contract.

##### trade
The trade function allows both the buy and sell parties to submit their side of the trade to the smart contract along with the collateral to settled the trade when it expires.  The trade information is validated against the pre-defined data provided in the list_option function above.  The contract will panic if the trade details don't match the counterparty or the option listing.

##### settle
The settle function allows either party to settle the trade if the expiration has passed.  The settle function calls the oracle to gether market data and state and verifies that settlement is possible.  If settlement can proceed, the payouts of collateral are computed and each counterparty is allowed to withdraw their final settlement amount.  The trade is then complete.

##### info
The info function dumps the current option and trade info.

###### Disclaimer
[Disclaimer](../../DISCLAIMER.md)