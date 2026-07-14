#![cfg(test)]

use super::*;
use soroban_sdk::{
    bytes,
    testutils::{Address as _, Events as _},
    Bytes, Env,
};

fn setup() -> (Env, Address, ZkVerifierContractClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register_contract(None, ZkVerifierContract);
    let client = ZkVerifierContractClient::new(&env, &id);
    client.initialize(&admin);
    let client: ZkVerifierContractClient<'static> = unsafe { core::mem::transmute(client) };
    (env, admin, client)
}

// ---- existing interface: empty inputs still panic ----

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_malformed_empty_proof_panics() {
    let (env, _, client) = setup();
    let proof = bytes!(&env,);
    let claim = bytes!(&env, 0xcafebabe);
    client.verify_claim(&proof, &claim);
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn test_malformed_empty_claim_panics() {
    let (env, _, client) = setup();
    let proof = bytes!(&env, 0xdeadbeef);
    let claim = bytes!(&env,);
    client.verify_claim(&proof, &claim);
}

// ---- oracle model tests ----

/// An unattested (proof, claim) pair — never attested by any oracle — must
/// return `false`, not panic.
#[test]
fn test_unattested_proof_returns_false() {
    let (env, _, client) = setup();
    let proof = bytes!(&env, 0xdeadbeef);
    let claim = bytes!(&env, 0xcafebabe);
    assert!(!client.verify_claim(&proof, &claim));
}

// ── Existing correctness tests ────────────────────────────────────────────────

/// A (proof, claim) pair attested by a currently-registered oracle — must
/// return true.
#[test]
fn test_attested_proof_returns_true() {
    let (env, _, client) = setup();
    let oracle = Address::generate(&env);
    client.register_oracle(&oracle);

    let proof = bytes!(&env, 0xdeadbeef);
    let claim = bytes!(&env, 0xcafebabe);
    client.attest(&oracle, &proof, &claim);

    assert!(client.verify_claim(&proof, &claim));
}

/// Attesting one proof does not validate a different, unattested proof for
/// the same claim.
#[test]
fn test_different_proof_not_validated_after_attestation() {
    let (env, _, client) = setup();
    let oracle = Address::generate(&env);
    client.register_oracle(&oracle);

    let proof = bytes!(&env, 0xdeadbeef);
    let claim = bytes!(&env, 0xcafebabe);
    client.attest(&oracle, &proof, &claim);

    let other_proof = bytes!(&env, 0x1234);
    assert!(!client.verify_claim(&other_proof, &claim));
}

/// Once the attesting oracle is revoked, its previously-stored attestation
/// must no longer be honored — `verify_claim` returns `false`, not panic.
#[test]
fn test_revoked_oracle_attestation_no_longer_accepted() {
    let (env, _, client) = setup();
    let oracle = Address::generate(&env);
    client.register_oracle(&oracle);

    let proof = bytes!(&env, 0xdeadbeef);
    let claim = bytes!(&env, 0xcafebabe);
    client.attest(&oracle, &proof, &claim);

    // Attestation is honored while the oracle remains registered.
    assert!(client.verify_claim(&proof, &claim));

    // Revoking the oracle does not delete the stored attestation record, but
    // verify_claim must stop honoring it since the attesting oracle is no
    // longer currently registered.
    client.revoke_oracle(&oracle);
    assert!(!client.is_oracle(&oracle));
    assert!(!client.verify_claim(&proof, &claim));
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_unregistered_oracle_cannot_attest() {
    let (env, _, client) = setup();
    let rogue = Address::generate(&env);

    let proof = bytes!(&env, 0xdeadbeef);
    let claim = bytes!(&env, 0xcafebabe);
    client.attest(&rogue, &proof, &claim);
}

#[test]
fn test_register_and_is_oracle() {
    let (env, _, client) = setup();
    let oracle = Address::generate(&env);

    assert!(!client.is_oracle(&oracle));
    client.register_oracle(&oracle);
    assert!(client.is_oracle(&oracle));
    client.revoke_oracle(&oracle);
    assert!(!client.is_oracle(&oracle));
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_double_initialize_fails() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let id = env.register_contract(None, ZkVerifierContract);
    let client = ZkVerifierContractClient::new(&env, &id);
    client.initialize(&admin);
    client.initialize(&admin);
}

// ── #817: Input size limit tests ──────────────────────────────────────────────

/// Proof at exactly MAX_PROOF_SIZE — must pass validation (no panic) and,
/// once attested by a registered oracle, must verify as true.
#[test]
fn test_proof_at_max_size_succeeds() {
    let (env, _, client) = setup();
    let oracle = Address::generate(&env);
    client.register_oracle(&oracle);

    let data = [0xffu8; MAX_PROOF_SIZE as usize];
    let proof = Bytes::from_slice(&env, &data);
    let claim = bytes!(&env, 0xcafebabe);

    // Unattested: passes validation, but returns false.
    assert!(!client.verify_claim(&proof, &claim));

    client.attest(&oracle, &proof, &claim);
    assert!(client.verify_claim(&proof, &claim));
}

/// Proof one byte over MAX_PROOF_SIZE — must panic with ProofTooLarge (#3).
#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_proof_exceeds_max_size_panics() {
    let (env, _, client) = setup();
    let data = [0xffu8; MAX_PROOF_SIZE as usize + 1];
    let proof = Bytes::from_slice(&env, &data);
    let claim = bytes!(&env, 0xcafebabe);
    client.verify_claim(&proof, &claim);
}

/// Claim at exactly MAX_CLAIM_SIZE — must pass validation (no panic) and,
/// once attested by a registered oracle, must verify as true.
#[test]
fn test_claim_at_max_size_succeeds() {
    let (env, _, client) = setup();
    let oracle = Address::generate(&env);
    client.register_oracle(&oracle);

    let proof = bytes!(&env, 0xdeadbeef);
    let data = [0xaau8; MAX_CLAIM_SIZE as usize];
    let claim = Bytes::from_slice(&env, &data);

    // Unattested: passes validation, but returns false.
    assert!(!client.verify_claim(&proof, &claim));

    client.attest(&oracle, &proof, &claim);
    assert!(client.verify_claim(&proof, &claim));
}

/// Claim one byte over MAX_CLAIM_SIZE — must panic with ClaimTooLarge (#4).
#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_claim_exceeds_max_size_panics() {
    let (env, _, client) = setup();
    let proof = bytes!(&env, 0xdeadbeef);
    let data = [0xaau8; MAX_CLAIM_SIZE as usize + 1];
    let claim = Bytes::from_slice(&env, &data);
    client.verify_claim(&proof, &claim);
}

// ── #818: Event emission tests ────────────────────────────────────────────────

/// verify_claim with an attested proof must emit exactly one vfy_claim event.
#[test]
fn test_verify_claim_emits_event_on_true_result() {
    let (env, _, client) = setup();
    let oracle = Address::generate(&env);
    client.register_oracle(&oracle);

    let proof = bytes!(&env, 0xdeadbeef);
    let claim = bytes!(&env, 0xcafebabe);
    client.attest(&oracle, &proof, &claim);

    // attest() does not itself publish any events, so verify_claim() is the
    // only event source here.
    let result = client.verify_claim(&proof, &claim);
    assert!(result);
    assert_eq!(env.events().all().len(), 1);
}

/// verify_claim with an unattested proof must emit exactly one vfy_claim
/// event even when the result is false.
#[test]
fn test_verify_claim_emits_event_on_false_result() {
    let (env, _, client) = setup();
    let proof = bytes!(&env, 0xdeadbeef); // never attested → result = false
    let claim = bytes!(&env, 0xcafebabe);
    let result = client.verify_claim(&proof, &claim);
    assert!(!result);
    assert_eq!(env.events().all().len(), 1);
}
