#!/usr/bin/env bash
set -e

echo "Running TTL-Legacy tests..."
cargo test --manifest-path contracts/ttl_vault/Cargo.toml
echo "All tests passed."
