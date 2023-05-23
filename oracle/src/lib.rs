#![no_std]

use soroban_sdk::{contractimpl, contracttype, Address, BytesN, Env, Symbol, Vec};

mod token {
    soroban_sdk::contractimport!(file = "../../soroban_token_spec.wasm");
}

#[derive(Clone)]
#[contracttype]
pub struct UpdData {
    pub token: i128,     // Token contract, asset_code, asset_id  TBD
    pub price: i128,     // Price of asset in USD
    pub timestamp: i128, // Timestamp of price
    pub flags: i128, // Flags : MktOpen, MktClosed, Settlement, Halted, Bitmask 0,1,2,4,8,16,32... TBD
}

pub struct OracleContract;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    Quote,
    PxPumpHash,     // SHA256 hash of the price pump code
    PxPumpUser,     // User for the price pump that invokes the update function
    Users(Address), // List of users that can invoke the retrieve function
}

#[contractimpl]
impl OracleContract {
    pub fn init(env: Env) {
        if is_initialized(&env) == true {
            panic!("Contract already initialized");
        }
        env.storage().set(&DataKey::Init, &true);
    }

    pub fn set_pxpump_user(env: Env, user: Address) {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }
        env.storage().set(&DataKey::PxPumpUser, &user);
    }

    pub fn set_pxpump_hash(env: Env, hash: BytesN<32>) {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }
        env.storage().set(&DataKey::PxPumpHash, &hash);
    }

    pub fn update(env: Env, token: i128, price: i128, timestamp: i128, flags: i128) {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }

        let pxpump_user: Address = env.storage().get_unchecked(&DataKey::PxPumpUser).unwrap();

        pxpump_user.require_auth();

        let upd_data = UpdData {
            token,
            price,
            timestamp,
            flags,
        };
        env.storage().set(&DataKey::Quote, &upd_data);

        // Emit event
        let topic = (Symbol::new(&env, "update"), token);
        env.events().publish(topic, timestamp);
    }

    pub fn retrieve(env: Env) -> Vec<i128> {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }

        // TODO: Check if the caller is in the list of users that can invoke this function

        let upd_data: UpdData = env.storage().get_unchecked(&DataKey::Quote).unwrap();

        let timestamp = env.ledger().timestamp();

        // Emit event
        let topic = (Symbol::new( &env, "retrieve"), upd_data.token);
        env.events().publish(topic, timestamp);

        let mut ret_data: Vec<i128> = Vec::new(&env);
        ret_data.push_back(upd_data.token);
        ret_data.push_back(upd_data.price);
        ret_data.push_back(upd_data.timestamp);
        ret_data.push_back(upd_data.flags);
        ret_data
    }
}

fn is_initialized(env: &Env) -> bool {
    env.storage().has(&DataKey::Init)
}
