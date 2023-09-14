//! This contract demonstrates 'equity cash settled put option' concept
//! and implements a contract similar to a Claimable Balance (similar to
//! https://developers.stellar.org/docs/glossary/claimable-balance).
//! The contract allows a buyer and seller to deposit some amount of collateral
//! token and allow both the buyer and a seller to claim it after the expiration
//! date.  The contract is initialized with the option details.  The
//! buyer and seller then complete the contract by depositing collateral
//! commensurate with the trade price and maximum risk.  Both the buyer and seller
//! can claim the collateral after the expiration time adjusted for the final
//! settlement price, when the oracle has provided the price of the underlying
//! asset.
//!
//! TODO: Add features such as:
//! American options allowing the buyer to exercise the option at any time
//! before expiration.
//! Trade history.
//! Trading of options.  Keep track of positions by Address.
//! Trade netting to allow buyer and sellers to adjust balances based on
//! positions.
//! Allow the withdrawal of collateral if the opposing party has not
//! deposited collateral within a certain time period.
//!
//! ** trade function is broken, need to fix **
//! 
#![no_std]
#![allow(dead_code)]

#[contract]
struct OptionContract;

use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Symbol, Vec};

mod oracle {
    soroban_sdk::contractimport!(
        file = "../oracle/target/wasm32-unknown-unknown/release/soroban_oracle.wasm"
    );
}

// We're using const here because Rust doesn't allow BitOr for enums
const SIDE_SELL: u32 = 0;
const SIDE_BUY: u32 = 1;

const AMERICAN: u32 = 1; // American option, can be exercised at any time before expiration, not supported at this time
const EUROPEAN: u32 = 2; // European option, can only be exercised at expiration
const CALL: u32 = 4; // Call option
const PUT: u32 = 8; // Put option
const BINARY: u32 = 16; // Binary option, either 0 or 1
const CALL_SPRD: u32 = 32; // Basic call spread, long call at low strike, short call at high strike
const PUT_SPRD: u32 = 64; // Basic put spread, long put at low strike, short put at high strike

// These are the variables that are stored in the contract storage. We want to minimize the number of
// storage variables to minimize the cost of the contract.  We use a single storage variable to store
// all the option details.  The option details are stored as a vector of bytes.  The vector is
// serialized and deserialized using the soroban_sdk::storage::StorageValue trait.

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,         // Initialization flag
    BAdr,         // Buyer address
    SAdr,         // Seller address
    SDep,         // Seller deposit
    BDep,         // Buyer deposit
    Balance,      // Balance of the contract
    Strike,       // Strike price of the option, in terms of the collateral token
    MktPrice,     // Market price of the underlying asset in terms of the collateral token
    Expiration,   // Expiration time of the option, Unix timestamp in milliseconds
    Oracle,       // Oracle contract address
    Token,        // Collateral Token contract address
    Trds,         // Trade history, only for the initial buyer/seller at this point
    Admin,        // Option Smart Contract Admin address
    TradePx,      // Trade price
    TradeQty,     // Trade quantity
    OptionType,   // Option type, bitmask for option details
    OracleTs,     // Latest update from the Oracle's timestamp
    OracleFlags,  // Oracle flags, bitmask for update details
    OracleSymbol, // Oracle Symbol, the underlying asset symbol in some normalized standard format *See SYMBOLOGY.md for details
    TradeId,      // Trade ID
    Decimals,     // Number of decimals for the price and strike
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

// This is a very simplistic option trade report.  We know there's more to it than this!
#[derive(Clone)]
#[contracttype]
pub struct Trade {
    pub price: i128,     // Price of the trade, in terms of collateral token
    pub decimals: u32,    // Number of decimals for the price
    pub qty: i128,       // Quantity of the trade
    pub buyer: Address,  // Buyer address
    pub seller: Address, // Seller address
    pub date_time: u64,  // Date and time of the trade, Unix timestamp in milliseconds
    pub trade_id: u64,   // Trade ID
}

#[derive(Clone)]
#[contracttype]
pub struct Position {
    pub pos: i128,
    pub acct: Address,
    pub token: Address,
}

#[derive(Clone)]
#[contracttype]
pub struct OptionDef {
    pub collateral_token: Address,
    pub underlying_token: Address,
    pub underlying_symbol: Symbol,
    pub strike: i128,
    pub mkt_price: i128,
    pub exp: TimeBound,
    pub opt_type: u32, // Bitmask for options details 0x1 = American, 0x2 = European, 0x4 = Call, 0x8 = Put, 0xF = Binary,...
    pub symbol: Symbol,
    pub decimals: u32,
}

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
impl OptionContract {
    pub fn init(env: Env) {
        env.storage().instance().set(&DataKey::Init, &true);
    }

    pub fn list(
        env: Env,
        opt_type: u32,      // option type, only put option is supported at this time
        strike: i128,       // strike price
        decimals: u32,       // number of decimals for the strike price
        exp: u64,           // expiration date and time
        oracle: Address,    // oracle contract address
        token: Address,     // token address (e.g. USDC)
        admin: Address,     // admin address
    ) {
        if !is_initialized(&env) {
            panic!("contract is not initialized");
        }

        // TODO: Should we let anyone list an option in the future? 
        // For now, only the admin can list an option because we'll
        // assume the admin is the authority for KYC/AML and other
        // regulatory requirements.  The admin should know the buyer
        // and seller and their addresses.

        // Check that the caller is the admin
        admin.require_auth();

        let e: TimeBound = TimeBound {
            kind: TimeBoundKind::After,
            timestamp: exp,
        };
        // Set the option details
        if opt_type != (PUT | EUROPEAN)  {
            panic!("only put option is supported at this time");
        }
        
        // Do some checking on the input parameters
        if strike <= 0  {
            panic!("strike price must be greater than 0");
        }
        if exp <= env.ledger().timestamp()  {
            panic!("expiration time must be in the future");
        }

        // if oracle == Address::default()  {
        //     panic!("oracle address must be provided");
        // }
        // if token == BytesN::default()  {
        //     panic!("token address must be provided");
        // }
        // if admin == Address::default()  {
        //     panic!("admin address must be provided");
        // }

        // // Set the option details
        env.storage().instance().set(&DataKey::Init, &true);
        env.storage().instance().set(&DataKey::OptionType, &opt_type);
        env.storage().instance().set(&DataKey::Strike, &strike);
        env.storage().instance().set(&DataKey::Expiration, &e);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::SDep, &0);
        env.storage().instance().set(&DataKey::BDep, &0);
        env.storage().instance().set(&DataKey::Balance, &0);
        env.storage().instance().set(&DataKey::MktPrice, &0);
        env.storage().instance().set(&DataKey::OracleTs, &0);
        env.storage().instance().set(&DataKey::OracleFlags, &0);
        env.storage().instance().set(&DataKey::TradeId, &0);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
    }

    // Return the option details
    pub fn specs() {}
    // The seller deposits USDC to the contract in the amount of
    // strike price - option premium * number of options.
    // Example: Strike price is 100, premium is 10, number of options is 10.
    // Seller deposits 900 USDC.  This represents the seller's obligation in
    // worst case scenario of the asset price going to 0.
    pub fn trade(
        env: Env,
        counter_party: Address,
        token: Address,
        side: u32, // 0 = seller, 1 = buyer
        price: i128,
        decimals: u32,
        qty: i128,
        trade_id: u64,
    ) {
        counter_party.require_auth();

        if !is_initialized(&env) {
            panic!("contract not initialized");
        }

        // Get the option details
        let strike: i128 = env.storage().instance().get(&DataKey::Strike).unwrap();
        let exp: TimeBound = env.storage().instance().get(&DataKey::Expiration).unwrap();
        let trd_id: u64 = env.storage().instance().get(&DataKey::TradeId).unwrap();

        let mut seller_deposit: i128 = env.storage().instance().get(&DataKey::SDep).unwrap();
        let mut buyer_deposit: i128 = env.storage().instance().get(&DataKey::BDep).unwrap();

        let opt_decimals: u32 = env.storage().instance().get(&DataKey::Decimals).unwrap();

        // TODO: convert if necessary
        if decimals != opt_decimals {
            panic!("decimals mismatch");
        }

        if check_time_bound(&env, &exp) {
            panic!("past expiration date time");
        }

        if side == SIDE_SELL {
            if trade_id != 0 && trade_id != trd_id {
                panic!("trade already exists or invalid trade id");
            }
            if seller_deposit > 0 {
                panic!("seller deposit already exists");
            }
            // Calculate the new deposit requirements
            seller_deposit = (strike - price) * qty;

            // Transfer token from `counter_party` to this contract address.
            token::Client::new(&env, &token).transfer(
                &counter_party,
                &env.current_contract_address(),
                &seller_deposit,
            );
            // Update the trade variables
            env.storage().instance().set(&DataKey::SDep, &seller_deposit);
            env.storage().instance().set(&DataKey::TradeId, &trade_id);
            env.storage().instance().set(&DataKey::SAdr, &counter_party);
        } else if side == SIDE_BUY {
            if trade_id != 0 && trade_id != trd_id {
                panic!("trade already exists or invalid trade id");
            }
            if buyer_deposit > 0 {
                panic!("buyer deposit already exists");
            }
            // Calculate the new deposit requirements
            buyer_deposit = price * qty;

            // Transfer token from `counter_party` to this contract address.
            token::Client::new(&env, &token).transfer(
                &counter_party,
                &env.current_contract_address(),
                &buyer_deposit,
            );
            // Update the trade variables
            env.storage().instance().set(&DataKey::BDep, &buyer_deposit);
            env.storage().instance().set(&DataKey::TradeId, &trade_id);
            env.storage().instance().set(&DataKey::BAdr, &counter_party);
        } else {
            panic!("invalid side");
        }
    }

    // The function calls the oracle to provide the price of the underlying
    // asset.  The contract checks that the price is above/below the strike
    // price and allows the buyer/seller to claim the calculated balances if
    // the expiration is passed.
    // TODO: Figure out if this will be a pull or be called from the oracle.
    pub fn upd_px(env: Env) -> Vec<i128> {
        if !is_initialized(&env) {
            panic!("contract not initialized");
        }
        let oracle_contract_id: Address = env.storage().instance().get(&DataKey::Oracle).unwrap();

        // // Get without importing the oracle contract
        // let mut oracle_data: Vec<i128> = env.invoke_contract(
        //     &oracle_contract_id,
        //     &symbol_short!("retrieve"),
        //     Vec::new(&env)
        // );

        // Get with importing the oracle contract wasm
        let client = oracle::Client::new(&env, &oracle_contract_id);
        let oracle_data: Vec<i128> = client.retrieve();

        // Store the data

        env.storage().instance().set(
            &DataKey::OracleSymbol,
            &oracle_data.get(0).unwrap(),
        );
        env.storage().instance()
            .set(&DataKey::MktPrice, &oracle_data.get(1).unwrap());
        env.storage().instance()
            .set(&DataKey::OracleTs, &oracle_data.get(2).unwrap());
        env.storage().instance()
            .set(&DataKey::OracleFlags, &oracle_data.get(3).unwrap());
        oracle_data
    }

    // Get the current buyer obligation, seller obligation, and market price.
    // Example: Strike price is 100, trade price was 10, number of options is 10.
    // Current market price is 50.  Buyer is entitled to 500 USDC.  Seller is
    // entitled to 500 USDC.
    pub fn mtm(env: Env) -> Vec<i128> {
        if !is_initialized(&env) {
            panic!("contract not initialized");
        }
        // Update the market price from the oracle.
        let oracle_data: Vec<i128> = Self::upd_px(env.clone());

        // Get the option details and the trade details
        let strike: i128 = env.storage().instance().get(&DataKey::Strike).unwrap();
        let trade_price: i128 = env.storage().instance().get(&DataKey::TradePx).unwrap();
        let trade_qty: i128 = env.storage().instance().get(&DataKey::TradeQty).unwrap();
        let market_price: i128 = oracle_data.get(1).unwrap();

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

        // Return r
        r
    }

    // Can be called by the buyer or seller to claim the results of the trade
    // if the expiration is passed.
    pub fn settle(env: Env, counter_party: Address) {
        let exp: TimeBound = env.storage().instance().get(&DataKey::Expiration).unwrap();

        if !check_time_bound(&env, &exp) {
            panic!("time predicate is not fulfilled");
        }

        // Only the buyer or the seller can call this function.
        counter_party.require_auth();

        let strike: i128 = env.storage().instance().get(&DataKey::Strike).unwrap();
        //let trade_price: i128 = env.storage().instance().get(&DataKey::TradePx).unwrap();
        let trade_qty: i128 = env.storage().instance().get(&DataKey::TradeQty).unwrap();
        let market_price: i128 = env.storage().instance().get(&DataKey::MktPrice).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let buyer_adr: Address = env.storage().instance().get(&DataKey::BAdr).unwrap();
        let seller_adr: Address = env.storage().instance().get(&DataKey::SAdr).unwrap();
        let trade_px: i128 = env.storage().instance().get(&DataKey::TradePx).unwrap();
        let buyer_deposit: i128 = env.storage().instance().get(&DataKey::BDep).unwrap();
        let seller_deposit: i128 = env.storage().instance().get(&DataKey::SDep).unwrap();

        // Only the buyer or the seller can call this function.
        if counter_party != buyer_adr && counter_party != seller_adr {
            panic!("invalid counter party");
        }

        // Check the market price flags to see if the oracle is valid and we
        // have a settlement price.
        let oracle_flags: i128 = env.storage().instance().get(&DataKey::OracleFlags).unwrap();
        if oracle_flags != 1 {
            panic!("oracle flags not valid, no settlement price update");
        }

        // These would be the payouts if the buyer/seller exercised the option.
        let put_price: i128 = put_px(strike, market_price);
        // or if the expiration is passed.  This is a simple european put option.
        let buyer_settle: i128 = trade_qty * (put_price - trade_px); // If put_price = 0, buyer_settle < 0
        let seller_settle: i128 = trade_qty * (trade_px - put_price); // If put_price = 0, seller_settle > 0

        let buyer_payout: i128 = buyer_deposit - buyer_settle;
        let seller_payout: i128 = seller_deposit + seller_settle;

        let mut payout: i128 = 0;
        if counter_party == buyer_adr {
            if buyer_payout < 0 {
                panic!("buyer payout is negative");
            }
            if buyer_payout > 0 {
                payout = buyer_payout;
            }
        }
        if counter_party == seller_adr {
            if seller_payout < 0 {
                panic!("seller payout is negative");
            }
            if seller_payout > 0 {
                payout = seller_payout;
            }
        }
        if payout > 0 {
            // Transfer the stored amount of token to claimant after passing
            // all the checks.
            token::Client::new(&env, &token).transfer(
                &env.current_contract_address(),
                &counter_party,
                &payout,
            );
        }
    }
}

fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Init)
}

// Limited gain / loss option
fn put_px(strk_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if px >= strk_px {
        return 0;
    }

    return strk_px - px;
}

// Unlimited gain / loss option
fn call_px(strk_px: i128, px: i128) -> i128 {
    if px < 0 {
        panic!("Price can't be < 0");
    }
    if px <= strk_px {
        return 0;
    }
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
    if px <= strk1_px {
        return 0;
    }
    if px >= strk2_px {
        return strk2_px - strk1_px;
    }
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
    if px >= strk2_px {
        return 0;
    }
    if px <= strk1_px {
        return strk2_px - strk1_px;
    }
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
    if px <= strk1_px {
        return 0;
    }
    if px >= strk3_px {
        return 0;
    }
    if px <= strk2_px {
        return px - strk1_px;
    }
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
    if px <= strk1_px {
        return strk2_px - strk1_px;
    }
    if px >= strk4_px {
        return strk4_px - strk3_px;
    }
    if px <= strk2_px {
        return strk2_px - px;
    }
    if px >= strk3_px {
        return px - strk3_px;
    }
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
    if px < strk1_px {
        return strk1_px - px;
    }
    if px > strk2_px {
        return px - strk2_px;
    }
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

mod test;