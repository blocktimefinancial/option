

use soroban_sdk::{symbol_short, Env};
use crate::{Testsc, TestscClient};

#[test]
fn test() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, Testsc);
    let client = TestscClient::new(&env, &contract_id);

    // Test init
    client.hello(&symbol_short!("World"));

    client.hello2(&symbol_short!("World"));

    client.int_128test(&(1 as i128));

    client.uint_128test(&(1 as u128));

    client.int_64test(&(1 as i64));
}
