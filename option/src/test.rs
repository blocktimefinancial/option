#![cfg(test)]

extern crate std;

use super::{OptionContract, OptionContractClient};

use soroban_sdk::{testutils::Address as _, testutils::BytesN as _, Address, BytesN, Env};

#[test]
fn test() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, OptionContract);
    let client = OptionContractClient::new(&env, &contract_id);

    // Test init
    client.init();

    // Get the option specs
    client.specs();
}
