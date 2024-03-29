#![no_std]

#[contract]
struct OracleContract;

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, Symbol, Vec};

#[derive(Clone)]
#[contracttype]
pub struct UpdData {
    pub token: i128,     // Token contract, asset_code, asset_id  TBD
    pub price: i128,     // Price of asset in USD
    pub timestamp: i128, // Timestamp of price
    pub flags: i128, // Flags : MktOpen, MktClosed, Settlement, Halted, Bitmask 0,1,2,4,8,16,32... TBD
    pub decimals: u32, // Decimals of price
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    Quote,
    PxPumpHash,     // SHA256 hash of the price pump code
    PxPumpUser,     // User for the price pump that invokes the update function
    Users(Address), // List of users that can invoke the retrieve function
    Decimals
}

#[contractimpl]
impl OracleContract {
    pub fn init(env: Env) {
        if is_initialized(&env) == true {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&DataKey::Init, &true);
    }

    pub fn set_pxpump_user(env: Env, user: Address) {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }
        env.storage().instance().set(&DataKey::PxPumpUser, &user);
    }

    pub fn set_pxpump_hash(env: Env, hash: BytesN<32>) {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }
        env.storage().instance().set(&DataKey::PxPumpHash, &hash);
    }

    pub fn update(env: Env, token: i128, price: i128, timestamp: i128, flags: i128, decimals: u32) {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }

        // TODO: Implement this check
        let pxpump_user: Address = env.storage().instance().get(&DataKey::PxPumpUser).unwrap();
        pxpump_user.require_auth();

        let upd_data = UpdData {
            token,
            price,
            timestamp,
            flags,
            decimals,
        };
        env.storage().instance().set(&DataKey::Quote, &upd_data);

        // Emit event
        let topic = (Symbol::new(&env, "update"), token);
        env.events().publish(topic, timestamp);
    }

    pub fn retrieve(env: Env) -> Vec<i128> {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }

        // TODO: Check if the caller is in the list of users that can invoke this function

        let upd_data: UpdData = env.storage().instance().get(&DataKey::Quote).unwrap();

        let timestamp = env.ledger().timestamp();

        // Emit event
        let topic = (Symbol::new( &env, "retrieve"), upd_data.token);
        env.events().publish(topic, timestamp);

        let mut ret_data: Vec<i128> = Vec::new(&env);
        ret_data.push_back(upd_data.token);
        ret_data.push_back(upd_data.price);
        ret_data.push_back(upd_data.timestamp);
        ret_data.push_back(upd_data.flags);
        ret_data.push_back(upd_data.decimals as i128);
        ret_data
    }
}

fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Init)
}

mod test;