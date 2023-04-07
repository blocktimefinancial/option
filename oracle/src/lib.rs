#![no_std]

use soroban_sdk::{contractimpl, contracttype, Env};

mod token {
    soroban_sdk::contractimport!(file = "../../soroban_token_spec.wasm");
}

pub struct OracleContract;

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Init,
    Quote
}

#[contractimpl]
impl OracleContract {

    pub fn init(
        env: Env,
    ) {
        if is_initialized(&env) == true {
            panic!("Contract already initialized");
        }
        env.storage().set(&DataKey::Init, &true);
    }

    pub fn update(env: Env, quote: i128) {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }
        env.storage().set(&DataKey::Quote, &quote);
        
    }

    pub fn retrieve(env: Env) -> i128 {
        if is_initialized(&env) == false {
            panic!("Contract not initialized");
        }
        let quote: i128 = env.storage().get(&DataKey::Quote).unwrap_or(Ok(0)).unwrap();
        
        quote
    }
}

fn is_initialized(env: &Env) -> bool {
    env.storage().has(&DataKey::Init)
}
