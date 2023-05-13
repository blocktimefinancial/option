## PXPUMP - The price pump application for the oracle smart contract

#### Overview
The price pump application is responsible for providing the oracle SC the pricing data from a source of truth.  The source
of truth in this case should be the underlying listing exchange or an exchange that the underlying is reliably traded on.  In reality, the Soroban contracts can only be updated once approximately every 5 seconds.  Other SCs should be aware of the update interval and need to process accordingly.

#### Things to remember
1) Currently all feeds shutdown over the weekends and holidays.  The oracle must know the current state of the market.
2) All feeds can and will go down on occassion.  While "dirty" data is very rare, late or stale data must be delt with.
3) All real-time data feeds have fees charged by the exchange.  It is unlawful to re-distribute real-time data without
an exchange agreement to do so.  Various pricing policies apply for different tiers.
4) I would expect that all oracles would be policed by the entity providing the underlying data.  There may be a fee
for another smart contract that queries the oracle.  In the past, the NYSE has charge "a penny a peek" for real-time pricing.  It may be possible to configure a smart contract with USDC in order to pay an oracle for it's data.  This would be ideal.

#### Options for equity pricing
The options for sourcing equity pricing for US listed equities are as follows:
1) The listing exchange.
    a) The NYSE provides multiple feeds.  Each of the feeds has an associated cost involved.
    b) The NASDAQ provides multiple feeds. Each of the feeds has an associated cost involved.
    c) The CBOE provides multiple feeds. Each of the feeds has an associated cost involved.
2) Third party sources.
    a) Interactive Brokers provides a consolidated feed of all US equities.
    b) Spider Rock provides a consolidated feed of all US equities.

#### Options for commodity pricing
The options for sourcing commodity pricing for US traded commodities are as follows:
1) The CME MDP multicast feed.  This feed is timely and has associated fees.
2) The ICE feeds.

#### Options for US listed Options
The options for US listed option pricing feeds are as follows:
1) The OPRA multicast feeds from OCC
2) The CBOE

###### Disclaimer
[Disclaimer](../../DISCLAIMER.md)