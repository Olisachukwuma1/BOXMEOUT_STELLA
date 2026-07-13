# WASM Size Budget

## Overview

The TTL-Vault contract WASM size is monitored in CI to prevent regressions that would impact deployment costs and instruction budget constraints on Soroban.

## Budget Threshold

**512 KB** — Maximum recommended WASM size for `ttl_vault` contract

### Rationale

- **Deployment Cost**: Larger WASM files require more XLM to upload to Soroban
- **Instruction Budget**: Soroban imposes limits on code size; staying well below 1 MB provides safety margin
- **Performance**: Smaller WASM loads faster and uses less memory during contract execution

## Monitoring

The CI pipeline checks the WASM size on every push and pull request:

```bash
cargo build --package ttl-vault --target wasm32-unknown-unknown --release
stat target/wasm32-unknown-unknown/release/ttl_vault.wasm
```

If the size exceeds 512 KB, the CI build will fail with a clear message indicating the overage.

## Optimization Strategies

If the WASM size grows beyond the threshold, consider these optimizations:

### 1. Enable LTO (Link-Time Optimization)

Edit `contracts/ttl_vault/Cargo.toml`:

```toml
[profile.release]
lto = true
codegen-units = 1
```

### 2. Strip Unnecessary Dependencies

Review `Cargo.toml` for unused or redundant dependencies. Audit transitive dependencies:

```bash
cargo tree --package ttl-vault --duplicates
```

### 3. Reduce Debug Symbols

Ensure `strip = true` in release profile:

```toml
[profile.release]
strip = true
```

### 4. Use `wasm-opt`

After building, optimize with `binaryen`:

```bash
npm install -g binaryen
wasm-opt -Oz target/wasm32-unknown-unknown/release/ttl_vault.wasm -o ttl_vault.wasm
```

### 5. Refactor Large Functions

Break monolithic functions into smaller, modular components to improve compiler optimization.

## Updating the Threshold

If legitimate growth requires increasing the threshold:

1. Justify the increase in the PR description
2. Update both the CI step and this document
3. Ensure the new threshold still leaves adequate margin below Soroban's limits
4. Tag as a breaking change if it affects deployment pipeline

## CI Failure Example

```
❌ WASM size exceeds threshold by 50 KB
WASM size: 562 KB (threshold: 512 KB)
```

Action: Apply one or more optimizations above, then re-push.
