use soroban_sdk::{Env,Symbol};
use crate::{Testsc, TestscClient};


#[test]
fn test() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, Testsc);
    let client = TestscClient::new(&env, &contract_id);

    // Test init
    client.hello(&Symbol::short("World"));
}
