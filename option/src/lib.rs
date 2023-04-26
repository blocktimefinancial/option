//! This contract demonstrates 'put option' concept and implements a
//! contract similar to a Claimable Balance (similar to
//! https://developers.stellar.org/docs/glossary/claimable-balance).
//! The contract allows to deposit some amount of token and allow both
//! a buyer and a seller to claim it after a certain time.  The contract
//! is initialized with a list of buyer/seller, and option details.  The
//! buyer and seller can claim the balance after the expiration time, when
//! the oracle has provided the price of the underlying asset, and the
//! price is above/below the strike price.
//!
//! TODO: Add features such as:
//! American options allowing the buyer to exercise the option at any time
//! before expiration.
//! Trade history.
//! Trading of options.  Keep track of positions by Address.
//! Trade netting to allow buyer and sellers to adjust balances based on
//! positions.
//!
#![no_std]

use soroban_sdk::{contractimpl, contracttype, Address, BytesN, Env, Vec};

mod token {
    soroban_sdk::contractimport!(file = "../../soroban_token_spec.wasm");
}

const AMERICAN: u32 = 1;   // American option, can be exercised at any time before expiration, not supported at this time
const EUROPEAN: u32 = 2;   // European option, can only be exercised at expiration
const CALL: u32 = 4;       // Call option
const PUT: u32 = 8;        // Put option
const BINARY: u32 = 16;    // Binary option, either 0 or 1
const CALL_SPRD: u32 = 32;  // Basic call spread, long call at low strike, short call at high strike
const PUT_SPRD: u32 = 64;   // Basic put spread, long put at low strike, short put at high strike


#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    BAdr,
    SAdr,
    SDep,
    BDep,
    Balance,
    Strike,
    MktPrice,
    Expiration,
    Oracle,
    Token,
    Trds,
    Admin,
    TradePx,
    TradeQty,
    OptionType,
}

#[derive(Clone)]
#[contracttype]
pub enum TimeBoundKind {
    Before,
    After,
}

#[derive(Clone)]
#[contracttype]
pub struct TimeBound {
    pub kind: TimeBoundKind,
    pub timestamp: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct Trade {
    pub price: i128,
    pub qty: i128,
    pub buyer: Address,
    pub seller: Address,
    pub date_time: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct Position {
    pub pos: i128,
    pub acct: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct PutOption {
    pub token: BytesN<32>,
    pub stk: i128,
    pub trades: Vec<Address>,
    pub exp: TimeBound,
    pub opt_type: u32, // Bitmask for options details 0x1 = American, 0x2 = European, 0x4 = Call, 0x8 = Put, 0xF = Binary,... 
}

pub struct PutOptionContract;

// The 'timelock' part: check that provided timestamp is before/after
// the current ledger timestamp.
fn check_time_bound(env: &Env, time_bound: &TimeBound) -> bool {
    let ledger_timestamp = env.ledger().timestamp();

    match time_bound.kind {
        TimeBoundKind::Before => ledger_timestamp <= time_bound.timestamp,
        TimeBoundKind::After => ledger_timestamp >= time_bound.timestamp,
    }
}

// Contract usage:
// 1. Initialize the contract with the option details.
// 2. Buyer and seller deposit the required amount of token.
// 3. Buyer and seller can claim the balance after the expiration time.
// 4. Buyer and seller can claim the balance after the oracle has provided
//    the price of the underlying asset, and the price is above/below the
//    strike price.

#[contractimpl]
impl PutOptionContract {

    pub fn init(
        env: Env,
    ) {
        env.storage().set(&DataKey::Init, &true);
    }
    
    pub fn list(
        env: Env,
        opt_type: u32,     // option type, only put option is supported at this time
        strike: i128,      // strike price
        exp: u64,          // expiration date and time
        oracle: Address,   // oracle contract address
        token: BytesN<32>, // token address (e.g. USDC)
        admin: Address,    // admin address
    ) {
        if is_initialized(&env) {
            panic!("contract is already initialized");
        }
        // Check that the caller is the admin
        admin.require_auth();

        let e: TimeBound = TimeBound {
            kind: TimeBoundKind::After,
            timestamp: exp,
        };
        // Set the option details
        if opt_type != PUT | EUROPEAN {
            panic!("only put option is supported at this time");
        }
        
        // Do some checking on the input parameters
        if strike <= 0  {
            panic!("strike price must be greater than 0");
        }
        if exp <= env.ledger().timestamp() {
            panic!("expiration time must be in the future");
        }
        // TODO: check that oracle, admin and token are valid addresses
        // if oracle == Address::default() {
        //     panic!("oracle address must be provided");
        // }
        // if token == BytesN::default() {
        //     panic!("token address must be provided");
        // }
        // if admin == Address::default()  {
        //     panic!("admin address must be provided");
        // }
        // Set the option details
        env.storage().set(&DataKey::Init, &true);
        env.storage().set(&DataKey::OptionType, &opt_type);
        env.storage().set(&DataKey::Strike, &strike);
        env.storage().set(&DataKey::Expiration, &e);
        env.storage().set(&DataKey::Oracle, &oracle);
        env.storage().set(&DataKey::Token, &token);
        env.storage().set(&DataKey::SDep, &0);
        env.storage().set(&DataKey::BDep, &0);
        env.storage().set(&DataKey::Balance, &0);
        env.storage().set(&DataKey::Admin, &admin);
    }

    // Return the option details
    pub fn specs() {

    }
    // The seller deposits USDC to the contract in the amount of
    // strike price - option premium * number of options.
    // Example: Strike price is 100, premium is 10, number of options is 10.
    // Seller deposits 900 USDC.  This represents the seller's obligation in
    // worst case scenario of the asset price going to 0.
    pub fn trade(
        env: Env,
        seller_adr: Address,
        token: BytesN<32>,
        qty: i128,
        buyer_adr: Address,
        price: i128,
    ) {
        seller_adr.require_auth();
        buyer_adr.require_auth();

        if !is_initialized(&env) {
            panic!("contract not initialized");
        }

        // Get the option details
        let strike: i128 = env.storage().get_unchecked(&DataKey::Strike).unwrap();
        let exp: TimeBound = env.storage().get_unchecked(&DataKey::Expiration).unwrap();
        let mut trds: Vec<Trade> = env.storage().get_unchecked(&DataKey::Trds).unwrap();
        let mut seller_deposit: i128 = env.storage().get_unchecked(&DataKey::SDep).unwrap();
        let mut buyer_deposit: i128 = env.storage().get_unchecked(&DataKey::BDep).unwrap();

        if check_time_bound(&env, &exp) {
            panic!("past expiration date time");
        }

        if seller_deposit > 0 {
            panic!("seller deposit already exists");
        }

        if buyer_deposit > 0 {
            panic!("buyer deposit already exists");
        }

        // Calculate the new deposit requirements
        seller_deposit = strike - price * qty;
        buyer_deposit = price * qty;

        // Transfer token from `from` to this contract address.
        // TODO: .xfer() has changed
        // token::Client::new(&env, &token).xfer(
        //     &seller_adr,
        //     &env.current_contract_address(),
        //     &seller_deposit,
        // );

        // Transfer token from `from` to this contract address.
        // TODO: .xfer() has changed
        // token::Client::new(&env, &token).xfer(
        //     &buyer_adr,
        //     &env.current_contract_address(),
        //     &buyer_deposit,
        // );

        let ts: u64 = env.ledger().timestamp();

        // Store the balance entry.
        env.storage().set(&DataKey::BAdr, &buyer_adr);
        env.storage().set(&DataKey::SAdr, &seller_adr);
        env.storage().set(&DataKey::BDep, &buyer_deposit);
        env.storage().set(&DataKey::SDep, &seller_deposit);
        // Store the trade entry
        env.storage().set(&DataKey::Trds, &trds);

        trds.push_back(Trade {
            price,
            qty,
            buyer: buyer_adr,
            seller: seller_adr,
            date_time: ts,
        });
    }

    // The oracle calls this function to provide the price of the underlying
    // asset.  The contract checks that the price is above/below the strike
    // price and allows the buyer/seller to claim the calculated balances if
    // the expiration is passed.
    // TODO: Figure out if this will be a pull or be called from the oracle.
    pub fn upd_px(env: Env, token: BytesN<32>, px: i128) {
        if px < 0 {
            panic!("Price can't be < 0");
        }
        let t: BytesN<32> = env.storage().get_unchecked(&DataKey::Token).unwrap();
        if token != t {
            panic!("wrong token price");
        }
    }

    // Get the current buyer obligation, seller obligation, and market price.
    // Example: Strike price is 100, trade price was 10, number of options is 10.
    // Current market price is 50.  Buyer is entitled to 500 USDC.  Seller is
    // entitled to 500 USDC.
    pub fn mtm(env: Env) -> Vec<i128> {
        let strike: i128 = env.storage().get_unchecked(&DataKey::Strike).unwrap();
        let trade_price: i128 = env.storage().get_unchecked(&DataKey::TradePx).unwrap();
        let trade_qty: i128 = env.storage().get_unchecked(&DataKey::TradeQty).unwrap();
        let market_price: i128 = env.storage().get_unchecked(&DataKey::MktPrice).unwrap();

        // These are the original obligations of the buyer/seller.
        let buyer_obligation: i128 = trade_qty * (strike - trade_price);
        let seller_obligation: i128 = trade_qty * (trade_price - strike);

        // These would be the payouts if the buyer/seller exercised the option.
        // or if the expiration is passed.  This is a simple european put option.
        let buyer_payout: i128 = trade_qty * (market_price - strike);
        let seller_payout: i128 = trade_qty * (strike - market_price);

        // TODO: Return a vector of i128 with the data above
        let mut r: Vec<i128> = Vec::new(&env);
        r.push_back(buyer_obligation);
        r.push_back(seller_obligation);
        r.push_back(buyer_payout);
        r.push_back(seller_payout);

        return r;
    }

    // Can be called by the buyer or seller to claim the results of the trade
    // if the expiration is passed.
    pub fn settle(env: Env) {
        let exp: TimeBound = env.storage().get_unchecked(&DataKey::Expiration).unwrap();

        if !check_time_bound(&env, &exp) {
            panic!("time predicate is not fulfilled");
        }

        // TODO: Only the buyer or the seller can call this function.

        let strike: i128 = env.storage().get_unchecked(&DataKey::Strike).unwrap();
        //let trade_price: i128 = env.storage().get_unchecked(&DataKey::TradePx).unwrap();
        let trade_qty: i128 = env.storage().get_unchecked(&DataKey::TradeQty).unwrap();
        let market_price: i128 = env.storage().get_unchecked(&DataKey::MktPrice).unwrap();
        let token: BytesN<32> = env.storage().get_unchecked(&DataKey::Token).unwrap();
        let buyer_adr: Address = env.storage().get_unchecked(&DataKey::BAdr).unwrap();
        let seller_adr: Address = env.storage().get_unchecked(&DataKey::SAdr).unwrap();

        // TODO: This should be one or the other OR move to a buyer settle and a seller settle
        buyer_adr.require_auth();
        seller_adr.require_auth();

        // These would be the payouts if the buyer/seller exercised the option.
        // or if the expiration is passed.  This is a simple european put option.
        let buyer_payout: i128 = trade_qty * (market_price - strike);
        let seller_payout: i128 = trade_qty * (strike - market_price);

        // TODO: Check to see if the payouts matches the deposit totals

        // Transfer the stored amount of token to claimant after passing
        // all the checks.
        // TODO: .xfer() has changed
        // token::Client::new(&env, &token).xfer(
        //     &env.current_contract_address(),
        //     &seller_adr,
        //     &seller_payout,
        // );

        // token::Client::new(&env, &token).xfer(
        //     &env.current_contract_address(),
        //     &buyer_adr,
        //     &buyer_payout,
        // );
        // Remove the balance entry to prevent any further claims.
        env.storage().remove(&DataKey::Balance);
    }
}

fn is_initialized(env: &Env) -> bool {
    env.storage().has(&DataKey::Init)
}

// Limited gain / loss option
fn put_px(strk_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if px >= strk_px { return 0; }

    return strk_px - px;
}

// Unlimited gain / loss option
fn call_px(strk_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if px <= strk_px { return 0; }
    return px - strk_px;
}

// Limited gain / loss spread
fn call_sprd_px(strk1_px: i128, strk2_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if strk1_px > strk2_px {
        panic!("strk1_px > strk2_px");
    }
    if px <= strk1_px { return 0; }
    if px >= strk2_px { return strk2_px - strk1_px; }
    return px - strk1_px;
}

// Limited gain / loss spread
fn put_sprd_px(strk1_px: i128, strk2_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if strk1_px > strk2_px {
        panic!("strk1_px > strk2_px");
    }
    if px >= strk2_px { return 0; }
    if px <= strk1_px { return strk2_px - strk1_px; }
    return strk2_px - px;
}

// Limited gain / loss spread
fn butterfly_px(strk1_px: i128, strk2_px: i128, strk3_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if strk1_px > strk2_px {
        panic!("strk1_px > strk2_px");
    }
    if strk2_px > strk3_px {
        panic!("strk2_px > strk3_px");
    }
    if px <= strk1_px { return 0; }
    if px >= strk3_px { return 0;}
    if px <= strk2_px { return px - strk1_px; }
    return strk3_px - px;
}

// Limited gain / loss spread
fn condor_px(strk1_px: i128, strk2_px: i128, strk3_px: i128, strk4_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if strk1_px > strk2_px {
        panic!("strk1_px > strk2_px");
    }
    if strk2_px > strk3_px {
        panic!("strk2_px > strk3_px");
    }
    if strk3_px > strk4_px {
        panic!("strk3_px > strk4_px");
    }
    if px <= strk1_px {return strk2_px - strk1_px;}
    if px >= strk4_px {return strk4_px - strk3_px;}
    if px <= strk2_px {return strk2_px - px;}
    if px >= strk3_px {return px - strk3_px;}
    return 0;
}

// Unlimited gain for long, unlimited loss for short
fn strangle_px(strk1_px: i128, strk2_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if strk1_px > strk2_px {
        panic!("strk1_px > strk2_px");
    }
    if px < strk1_px { return strk1_px - px;}
    if px > strk2_px { return px - strk2_px;}
    return 0;
}

// We don't support this yet
// Unlimited gain for long, unlimited loss for short
fn straddle_px(strk1_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    
    let diff = px - strk1_px;
    return diff.abs();
}

