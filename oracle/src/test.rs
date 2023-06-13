#![cfg(test)]

extern crate std;

use super::{OracleContract, OracleContractClient};

use soroban_sdk::{testutils::Address as _, testutils::BytesN as _, Address, BytesN, Env};

#[test]
fn test() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, OracleContract);
    let client = OracleContractClient::new(&env, &contract_id);

    // Test init
    client.init();

    // Test set_pxpump_user
    let user: Address = Address::random(&env);
    client.set_pxpump_user(&user);

    // Test set_pxpump_hash
    let hash =  BytesN::random(&env);
    client.set_pxpump_hash(&hash);

    // Test update
    let token: i128 = 0;
    let price: i128 = 0;
    let timestamp: i128 = 0;
    let flags: i128 = 0;
    client.update(&token, &price, &timestamp, &flags);
}
