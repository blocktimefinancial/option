## Oracle Smart Contract (SC)

#### Overview
The Oracle acts as the source of truth on the blockchain.  It can be queried for pricing and market state in order
to fullfill requests from other SC's on the blockchain.  In the old TrdFi world, this is known as a ticker plant.

#### How it works.
The Oracle is fed pricing information from a real-world exchange or trusted third party.  This pricing information along
with certain market state information is stored in the Oracle.  Other SC's on the blockchain can then make cross-contract
calls to the Oracle and inquire price and market state data for processing in their SC's.

#### Things to watchout for
While an Oracle may call itself the most trusted, one must always be prepared for edge cases.  An Oracle is only as reliable as the pricing information that it is provided.  If that source is delayed or goes down, the Oracle may become comprimised.  The Oracle itself should only be able to be updated by the trusted source, any outside updates may comprimise the Oracle data.  In the case of this Oracle, exchange holidays must be tracked carefully and SC's using the Oracle data must be aware of them too.