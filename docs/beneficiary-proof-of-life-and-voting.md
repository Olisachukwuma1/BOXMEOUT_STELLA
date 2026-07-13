# Beneficiary Proof of Life & Voting

## Issue #498 — Beneficiary Proof of Life

### Overview

Before a vault release can be triggered, the designated beneficiary can be required to prove they are alive and in control of their address. This is an anti-fraud measure that prevents a stale or compromised beneficiary address from receiving funds.

### How It Works

1. The vault owner sets up a vault normally.
2. Before calling `trigger_release`, the beneficiary calls `submit_proof_of_life` to record a timestamped liveness proof on-chain.
3. The proof is valid for a configurable window (up to 30 days).
4. If a `ReleaseVoteThreshold` is set on the vault, a valid proof of life is **required** before release. If the proof is missing or expired, `trigger_release` panics with `ProofOfLifeRequired` or `ProofOfLifeExpired`.

### API

```rust
/// Submit a proof of life. Caller must be a listed beneficiary.
/// validity_window: seconds the proof remains valid (capped at 2_592_000 = 30 days).
submit_proof_of_life(env, vault_id, caller, validity_window) -> Result<(), ContractError>

/// Returns the current proof-of-life entry, if any.
get_proof_of_life(env, vault_id) -> Option<ProofOfLifeEntry>
```

### Events

| Topic | Data | Description |
|---|---|---|
| `pol_sub` | `(beneficiary, submitted_at, valid_until)` | Emitted when a proof of life is submitted |

### Errors

| Code | Name | Description |
|---|---|---|
| 30 | `NotBeneficiary` | Caller is not a listed beneficiary |
| 51 | `ProofOfLifeRequired` | No proof of life on record and voting threshold is set |
| 52 | `ProofOfLifeExpired` | Proof of life exists but has expired |

---

## Issue #499 — Beneficiary Voting

### Overview

When a vault has multiple beneficiaries, the vault owner can require a minimum number of beneficiary approvals before `trigger_release` can proceed. This prevents a single party from unilaterally triggering a release.

### How It Works

1. The vault owner calls `set_release_vote_threshold` to set the minimum number of approvals required.
2. Each beneficiary calls `cast_release_vote` with `approve = true` or `approve = false`.
3. Each beneficiary may vote only once.
4. When the number of approvals reaches the threshold, a `vote_ok` event is emitted.
5. `trigger_release` checks that approvals >= threshold before proceeding.
6. Setting the threshold to `0` disables voting.

### API

```rust
/// Set the minimum approval count required before release. Owner only.
/// threshold = 0 disables voting.
set_release_vote_threshold(env, vault_id, caller, threshold) -> Result<(), ContractError>

/// Cast a vote. Caller must be a listed beneficiary. Each address may vote once.
cast_release_vote(env, vault_id, caller, approve) -> Result<(), ContractError>

/// Returns all votes cast for a vault.
get_release_votes(env, vault_id) -> Vec<ReleaseVoteEntry>

/// Returns the current vote threshold, if set.
get_release_vote_threshold(env, vault_id) -> Option<u32>
```

### Events

| Topic | Data | Description |
|---|---|---|
| `rel_vote` | `(voter, approve, voted_at)` | Emitted when a vote is cast |
| `vote_ok` | `approvals` | Emitted when approvals reach the threshold |

### Errors

| Code | Name | Description |
|---|---|---|
| 6 | `NotOwner` | Only the vault owner can set the threshold |
| 30 | `NotBeneficiary` | Voter is not a listed beneficiary |
| 53 | `AlreadyVoted` | This address has already cast a vote |
| 54 | `VotingNotEnabled` | No threshold is set; voting is not active |
