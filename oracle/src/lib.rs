#![no_std]

use soroban_sdk::{contractimpl, contracttype, Address, BytesN, Env, Vec};

mod token {
    soroban_sdk::contractimport!(file = "../soroban_token_spec.wasm");
}

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
        Env::set_data(DataKey::Init, true);
    }

    pub fn update(env: Env, quote: BytesN) {

        Env::set_data(DataKey::Quote, quote);
        
    }

    pub fn retrieve() {
        let quote = Env::get_data(DataKey::Quote);
        Env::set_data(DataKey::Quote, quote);
    }
}

fn is_initialized(env: &Env) -> bool {
    env.storage().has(&DataKey::Init)
}
