#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, vec, Address, Bytes, Env, Symbol, Vec};
#[contract]
pub struct Testsc;

#[contractimpl]
impl Testsc {
    // This is a simple function that returns a vector of symbols
    pub fn hello(env: Env, to: Symbol) -> Vec<Symbol> {
        const HELLO: Symbol = symbol_short!("Hello");
        vec![&env, HELLO, to]
    }

    pub fn hello2(env: Env, to: Symbol) -> Vec<Symbol> {
        const HELLO: Symbol = symbol_short!("Hellooo");
        vec![&env, HELLO, to]
    }
    // Now we start adding some more complex functions, one parameter type at a time
    pub fn int_128test(_env: Env, i: i128) -> i128 {
        i
    }

    pub fn uint_128test(_env: Env, i: u128) -> u128 {
        i
    }

    pub fn int_64test(_env: Env, i: i64) -> i64 {
        i
    }

    pub fn uint_64test(_env: Env, i: u64) -> u64 {
        i
    }

    pub fn int_32test(_env: Env, i: i32) -> i32 {
        i
    }

    pub fn uint_32test(_env: Env, i: u32) -> u32 {
        i
    }

    pub fn booltest(_env: Env, b: bool) -> bool {
        b
    }

    pub fn symboltest(_env: Env, s: Symbol) -> Symbol {
        s
    }

    pub fn address_test(_env: Env, a: Address) -> Address {
        a
    }

    pub fn bytes_test(_env: Env, b: Bytes) -> Bytes {
        b
    }

    pub fn vec_test(_env: Env, v: Vec<i128>) -> Vec<i128> {
        v
    }

    pub fn signing_test(_env: Env, a: Address) -> Address {
        a.require_auth();
        a
    }

    pub fn dbl_sign_test(_env: Env, a: Address, b: Address) -> (Address, Address) {
        a.require_auth();
        b.require_auth();
        (a, b)
    }

    pub fn test_all(
        _env: Env,
        pu32: u32,
        pu64: u64,
        pu128: u128,
        ps: Symbol,
        padr: Address,
        pbytes: Bytes,
        pvec: Vec<i128>,
    ) -> (u32, u64, u128, Symbol, Address, Bytes, Vec<i128>) {
        (pu32, pu64, pu128, ps, padr, pbytes, pvec)
    }
}

#[cfg(test)]
mod test;
