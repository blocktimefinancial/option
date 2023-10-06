import * as SorobanClient from 'soroban-client';
import { ContractSpec, Address } from 'soroban-client';
import { Buffer } from "buffer";
import { invoke } from './invoke.js';
import type { ResponseTypes, Wallet, ClassOptions } from './method-options.js'

export * from './invoke.js'
export * from './method-options.js'

export type u32 = number;
export type i32 = number;
export type u64 = bigint;
export type i64 = bigint;
export type u128 = bigint;
export type i128 = bigint;
export type u256 = bigint;
export type i256 = bigint;
export type Option<T> = T | undefined;
export type Typepoint = bigint;
export type Duration = bigint;
export {Address};

/// Error interface containing the error message
export interface Error_ { message: string };

export interface Result<T, E extends Error_> {
    unwrap(): T,
    unwrapErr(): E,
    isOk(): boolean,
    isErr(): boolean,
};

export class Ok<T, E extends Error_ = Error_> implements Result<T, E> {
    constructor(readonly value: T) { }
    unwrapErr(): E {
        throw new Error('No error');
    }
    unwrap(): T {
        return this.value;
    }

    isOk(): boolean {
        return true;
    }

    isErr(): boolean {
        return !this.isOk()
    }
}

export class Err<E extends Error_ = Error_> implements Result<any, E> {
    constructor(readonly error: E) { }
    unwrapErr(): E {
        return this.error;
    }
    unwrap(): never {
        throw new Error(this.error.message);
    }

    isOk(): boolean {
        return false;
    }

    isErr(): boolean {
        return !this.isOk()
    }
}

if (typeof window !== 'undefined') {
    //@ts-ignore Buffer exists
    window.Buffer = window.Buffer || Buffer;
}

const regex = /Error\(Contract, #(\d+)\)/;

function parseError(message: string): Err | undefined {
    const match = message.match(regex);
    if (!match) {
        return undefined;
    }
    if (Errors === undefined) {
        return undefined;
    }
    let i = parseInt(match[1], 10);
    let err = Errors[i];
    if (err) {
        return new Err(err);
    }
    return undefined;
}

export const networks = {
    futurenet: {
        networkPassphrase: "Test SDF Future Network ; October 2022",
        contractId: "CDAMGXO4ATHL2A74LDD4V6CQTMASOLRP2W2WXYPKKQ6AA3BQDLSBZOJA",
    }
} as const

export type DataKey = {tag: "Init", values: void} | {tag: "BAdr", values: void} | {tag: "SAdr", values: void} | {tag: "SDep", values: void} | {tag: "BDep", values: void} | {tag: "Balance", values: void} | {tag: "Strike", values: void} | {tag: "MktPrice", values: void} | {tag: "Expiration", values: void} | {tag: "Oracle", values: void} | {tag: "Token", values: void} | {tag: "Trds", values: void} | {tag: "Admin", values: void} | {tag: "TradePx", values: void} | {tag: "TradeQty", values: void} | {tag: "OptionType", values: void} | {tag: "OracleTs", values: void} | {tag: "OracleFlags", values: void} | {tag: "OracleSymbol", values: void} | {tag: "TradeId", values: void} | {tag: "Decimals", values: void} | {tag: "KillSwitch", values: void} | {tag: "Version", values: void};

export type TimeBoundKind = {tag: "Before", values: void} | {tag: "After", values: void};

export interface TimeBound {
  kind: TimeBoundKind;
  timestamp: u64;
}

export interface Trade {
  buyer: Address;
  date_time: u64;
  decimals: u32;
  price: i128;
  qty: i128;
  seller: Address;
  trade_id: u64;
}

export interface Position {
  acct: Address;
  pos: i128;
  token: Address;
}

export interface OptionDef {
  collateral_token: Address;
  decimals: u32;
  exp: TimeBound;
  mkt_price: i128;
  opt_type: u32;
  strike: i128;
  symbol: string;
  underlying_symbol: string;
  underlying_token: Address;
}

const Errors = {

}

export class Contract {
            spec: ContractSpec;
    constructor(public readonly options: ClassOptions) {
        this.spec = new ContractSpec([
            "AAAAAgAAAAAAAAAAAAAAB0RhdGFLZXkAAAAAFwAAAAAAAAAAAAAABEluaXQAAAAAAAAAAAAAAARCQWRyAAAAAAAAAAAAAAAEU0FkcgAAAAAAAAAAAAAABFNEZXAAAAAAAAAAAAAAAARCRGVwAAAAAAAAAAAAAAAHQmFsYW5jZQAAAAAAAAAAAAAAAAZTdHJpa2UAAAAAAAAAAAAAAAAACE1rdFByaWNlAAAAAAAAAAAAAAAKRXhwaXJhdGlvbgAAAAAAAAAAAAAAAAAGT3JhY2xlAAAAAAAAAAAAAAAAAAVUb2tlbgAAAAAAAAAAAAAAAAAABFRyZHMAAAAAAAAAAAAAAAVBZG1pbgAAAAAAAAAAAAAAAAAAB1RyYWRlUHgAAAAAAAAAAAAAAAAIVHJhZGVRdHkAAAAAAAAAAAAAAApPcHRpb25UeXBlAAAAAAAAAAAAAAAAAAhPcmFjbGVUcwAAAAAAAAAAAAAAC09yYWNsZUZsYWdzAAAAAAAAAAAAAAAADE9yYWNsZVN5bWJvbAAAAAAAAAAAAAAAB1RyYWRlSWQAAAAAAAAAAAAAAAAIRGVjaW1hbHMAAAAAAAAAAAAAAApLaWxsU3dpdGNoAAAAAAAAAAAAAAAAAAdWZXJzaW9uAA==",
        "AAAAAgAAAAAAAAAAAAAADVRpbWVCb3VuZEtpbmQAAAAAAAACAAAAAAAAAAAAAAAGQmVmb3JlAAAAAAAAAAAAAAAAAAVBZnRlcgAAAA==",
        "AAAAAQAAAAAAAAAAAAAACVRpbWVCb3VuZAAAAAAAAAIAAAAAAAAABGtpbmQAAAfQAAAADVRpbWVCb3VuZEtpbmQAAAAAAAAAAAAACXRpbWVzdGFtcAAAAAAAAAY=",
        "AAAAAQAAAAAAAAAAAAAABVRyYWRlAAAAAAAABwAAAAAAAAAFYnV5ZXIAAAAAAAATAAAAAAAAAAlkYXRlX3RpbWUAAAAAAAAGAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAABXByaWNlAAAAAAAACwAAAAAAAAADcXR5AAAAAAsAAAAAAAAABnNlbGxlcgAAAAAAEwAAAAAAAAAIdHJhZGVfaWQAAAAG",
        "AAAAAQAAAAAAAAAAAAAACFBvc2l0aW9uAAAAAwAAAAAAAAAEYWNjdAAAABMAAAAAAAAAA3BvcwAAAAALAAAAAAAAAAV0b2tlbgAAAAAAABM=",
        "AAAAAQAAAAAAAAAAAAAACU9wdGlvbkRlZgAAAAAAAAkAAAAAAAAAEGNvbGxhdGVyYWxfdG9rZW4AAAATAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAAA2V4cAAAAAfQAAAACVRpbWVCb3VuZAAAAAAAAAAAAAAJbWt0X3ByaWNlAAAAAAAACwAAAAAAAAAIb3B0X3R5cGUAAAAEAAAAAAAAAAZzdHJpa2UAAAAAAAsAAAAAAAAABnN5bWJvbAAAAAAAEQAAAAAAAAARdW5kZXJseWluZ19zeW1ib2wAAAAAAAARAAAAAAAAABB1bmRlcmx5aW5nX3Rva2VuAAAAEw==",
        "AAAAAAAAAAAAAAAEaW5pdAAAAAAAAAAA",
        "AAAAAAAAAAAAAAAKa2lsbHN3aXRjaAAAAAAAAgAAAAAAAAAKYWRtaW5fdXNlcgAAAAAAEwAAAAAAAAAKa2lsbHN3aXRjaAAAAAAABAAAAAEAAAAE",
        "AAAAAAAAAAAAAAAEbGlzdAAAAAcAAAAAAAAACG9wdF90eXBlAAAABAAAAAAAAAAGc3RyaWtlAAAAAAALAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAAA2V4cAAAAAAGAAAAAAAAAAZvcmFjbGUAAAAAABMAAAAAAAAABXRva2VuAAAAAAAAEwAAAAAAAAAFYWRtaW4AAAAAAAATAAAAAQAAAAQ=",
        "AAAAAAAAAAAAAAAFc3BlY3MAAAAAAAAAAAAAAQAAB9AAAAAJT3B0aW9uRGVmAAAA",
        "AAAAAAAAAAAAAAAFdHJhZGUAAAAAAAAHAAAAAAAAAA1jb3VudGVyX3BhcnR5AAAAAAAAEwAAAAAAAAAFdG9rZW4AAAAAAAATAAAAAAAAAARzaWRlAAAABAAAAAAAAAAFcHJpY2UAAAAAAAALAAAAAAAAAAhkZWNpbWFscwAAAAQAAAAAAAAAA3F0eQAAAAALAAAAAAAAAAh0cmFkZV9pZAAAAAYAAAAA",
        "AAAAAAAAAAAAAAAGdXBkX3B4AAAAAAAAAAAAAQAAA+oAAAAL",
        "AAAAAAAAAAAAAAADbXRtAAAAAAEAAAAAAAAABHVzZXIAAAATAAAAAQAAA+oAAAAL",
        "AAAAAAAAAAAAAAAGc2V0dGxlAAAAAAABAAAAAAAAAA1jb3VudGVyX3BhcnR5AAAAAAAAEwAAAAA="
            ]);
    }
    async init<R extends ResponseTypes = undefined>(options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'init',
            args: this.spec.funcArgsToScVals("init", {}),
            ...options,
            ...this.options,
            parseResultXdr: () => {},
        });
    }


    async killswitch<R extends ResponseTypes = undefined>({admin_user, killswitch}: {admin_user: Address, killswitch: u32}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `u32`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'killswitch',
            args: this.spec.funcArgsToScVals("killswitch", {admin_user, killswitch}),
            ...options,
            ...this.options,
            parseResultXdr: (xdr): u32 => {
                return this.spec.funcResToNative("killswitch", xdr);
            },
        });
    }


    async list<R extends ResponseTypes = undefined>({opt_type, strike, decimals, exp, oracle, token, admin}: {opt_type: u32, strike: i128, decimals: u32, exp: u64, oracle: Address, token: Address, admin: Address}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `u32`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'list',
            args: this.spec.funcArgsToScVals("list", {opt_type, strike, decimals, exp, oracle, token, admin}),
            ...options,
            ...this.options,
            parseResultXdr: (xdr): u32 => {
                return this.spec.funcResToNative("list", xdr);
            },
        });
    }


    async specs<R extends ResponseTypes = undefined>(options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `OptionDef`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'specs',
            args: this.spec.funcArgsToScVals("specs", {}),
            ...options,
            ...this.options,
            parseResultXdr: (xdr): OptionDef => {
                return this.spec.funcResToNative("specs", xdr);
            },
        });
    }


    async trade<R extends ResponseTypes = undefined>({counter_party, token, side, price, decimals, qty, trade_id}: {counter_party: Address, token: Address, side: u32, price: i128, decimals: u32, qty: i128, trade_id: u64}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'trade',
            args: this.spec.funcArgsToScVals("trade", {counter_party, token, side, price, decimals, qty, trade_id}),
            ...options,
            ...this.options,
            parseResultXdr: () => {},
        });
    }


    async updPx<R extends ResponseTypes = undefined>(options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `Array<i128>`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'upd_px',
            args: this.spec.funcArgsToScVals("upd_px", {}),
            ...options,
            ...this.options,
            parseResultXdr: (xdr): Array<i128> => {
                return this.spec.funcResToNative("upd_px", xdr);
            },
        });
    }


    async mtm<R extends ResponseTypes = undefined>({user}: {user: Address}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `Array<i128>`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'mtm',
            args: this.spec.funcArgsToScVals("mtm", {user}),
            ...options,
            ...this.options,
            parseResultXdr: (xdr): Array<i128> => {
                return this.spec.funcResToNative("mtm", xdr);
            },
        });
    }


    async settle<R extends ResponseTypes = undefined>({counter_party}: {counter_party: Address}, options: {
        /**
         * The fee to pay for the transaction. Default: 100.
         */
        fee?: number
        /**
         * What type of response to return.
         *
         *   - `undefined`, the default, parses the returned XDR as `void`. Runs preflight, checks to see if auth/signing is required, and sends the transaction if so. If there's no error and `secondsToWait` is positive, awaits the finalized transaction.
         *   - `'simulated'` will only simulate/preflight the transaction, even if it's a change/set method that requires auth/signing. Returns full preflight info.
         *   - `'full'` return the full RPC response, meaning either 1. the preflight info, if it's a view/read method that doesn't require auth/signing, or 2. the `sendTransaction` response, if there's a problem with sending the transaction or if you set `secondsToWait` to 0, or 3. the `getTransaction` response, if it's a change method with no `sendTransaction` errors and a positive `secondsToWait`.
         */
        responseType?: R
        /**
         * If the simulation shows that this invocation requires auth/signing, `invoke` will wait `secondsToWait` seconds for the transaction to complete before giving up and returning the incomplete {@link SorobanClient.SorobanRpc.GetTransactionResponse} results (or attempting to parse their probably-missing XDR with `parseResultXdr`, depending on `responseType`). Set this to `0` to skip waiting altogether, which will return you {@link SorobanClient.SorobanRpc.SendTransactionResponse} more quickly, before the transaction has time to be included in the ledger. Default: 10.
         */
        secondsToWait?: number
    } = {}) {
                    return await invoke({
            method: 'settle',
            args: this.spec.funcArgsToScVals("settle", {counter_party}),
            ...options,
            ...this.options,
            parseResultXdr: () => {},
        });
    }

}