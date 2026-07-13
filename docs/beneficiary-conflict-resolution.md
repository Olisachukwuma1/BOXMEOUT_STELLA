# Beneficiary Conflict Resolution

**Issue**: #502  
**Status**: Implemented  
**Last Updated**: 2026-05-28

## Overview

Beneficiary Conflict Resolution provides automated conflict resolution when multiple beneficiaries claim the same vault or have conflicting claims. This feature enables beneficiaries to file conflict claims and allows administrators to resolve disputes fairly.

## Use Cases

1. **Multiple Claimants**: When multiple parties claim to be the rightful beneficiary
2. **Disputed Inheritance**: When beneficiary status is contested
3. **Claim Documentation**: When beneficiaries need to formally document their claim
4. **Admin Resolution**: When administrators need to resolve disputes and approve the rightful beneficiary

## API

### `file_beneficiary_conflict(vault_id: u64, reason: String) -> Result<(), ContractError>`

**Caller**: Beneficiary only  
**Auth**: Required

Beneficiary files a conflict claim for a vault.

**Parameters**:
- `vault_id`: The vault ID
- `reason`: Reason for the conflict claim (must not be empty)

**Returns**: `Ok(())` on success, or `ContractError` on failure

**Errors**:
- `InvalidAmount`: If reason is empty
- `NotBeneficiary`: If caller is not the beneficiary
- `VaultNotFound`: If vault does not exist

**Events**: Emits `BENEFICIARY_CONFLICT_FILED_TOPIC` with vault_id and beneficiary

**Example**:
```rust
client.file_beneficiary_conflict(&vault_id, &String::from_str(&env, "Conflicting claim from another party"))?;
```

### `resolve_beneficiary_conflict(vault_id: u64, approved_beneficiary: Address) -> Result<(), ContractError>`

**Caller**: Admin only  
**Auth**: Required

Administrator resolves a beneficiary conflict by approving the rightful beneficiary.

**Parameters**:
- `vault_id`: The vault ID
- `approved_beneficiary`: The address of the approved beneficiary

**Returns**: `Ok(())` on success, or `ContractError` on failure

**Errors**:
- `InvalidBeneficiary`: If no conflict exists or conflict already resolved
- `NotAdmin`: If caller is not an administrator

**Events**: Emits `BENEFICIARY_CONFLICT_RESOLVED_TOPIC` with vault_id and approved beneficiary

**Example**:
```rust
client.resolve_beneficiary_conflict(&vault_id, &approved_beneficiary)?;
```

### `get_beneficiary_conflict(vault_id: u64) -> Option<BeneficiaryConflict>`

**Caller**: Anyone  
**Auth**: Not required

Retrieves the beneficiary conflict entry if it exists.

**Returns**: 
- `Some(BeneficiaryConflict)` if a conflict exists
- `None` if no conflict has been filed

**Structure**:
```rust
pub struct BeneficiaryConflict {
    pub vault_id: u64,
    pub claims: Vec<BeneficiaryConflictClaim>,
    pub resolution: ConflictResolution,
    pub resolved_at: Option<u64>,
}

pub struct BeneficiaryConflictClaim {
    pub claimant: Address,
    pub reason: String,
    pub filed_at: u64,
}

pub enum ConflictResolution {
    Pending,
    Approved(Address),
    Rejected,
}
```

**Example**:
```rust
if let Some(conflict) = client.get_beneficiary_conflict(&vault_id) {
    println!("Claims: {}", conflict.claims.len());
    println!("Resolution: {:?}", conflict.resolution);
}
```

## Behavior

### Filing a Conflict

1. **Beneficiary Initiates**: Beneficiary calls `file_beneficiary_conflict()` with reason
2. **Claim Recorded**: Claim is added to vault's conflict record with timestamp
3. **Event Emitted**: `BENEFICIARY_CONFLICT_FILED_TOPIC` event is published
4. **Status**: Conflict remains in `Pending` state

### Resolving a Conflict

1. **Admin Reviews**: Administrator reviews all claims
2. **Admin Approves**: Administrator calls `resolve_beneficiary_conflict()` with approved beneficiary
3. **Resolution Recorded**: Conflict status changes to `Approved(Address)`
4. **Timestamp Set**: Resolution timestamp is recorded
5. **Event Emitted**: `BENEFICIARY_CONFLICT_RESOLVED_TOPIC` event is published

### Multiple Claims

- Multiple beneficiaries can file claims for the same vault
- All claims are recorded in order with timestamps
- Administrator reviews all claims before resolving
- Only one beneficiary can be approved

## Events

### `BENEFICIARY_CONFLICT_FILED_TOPIC` (ben_conf)

Emitted when a beneficiary files a conflict claim.

**Data**:
```
(vault_id: u64, beneficiary: Address)
```

### `BENEFICIARY_CONFLICT_RESOLVED_TOPIC` (ben_res)

Emitted when a conflict is resolved.

**Data**:
```
(vault_id: u64, approved_beneficiary: Address)
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|-----------|
| `InvalidAmount` | Reason is empty | Provide a non-empty reason |
| `NotBeneficiary` | Caller is not beneficiary | Call as the beneficiary |
| `InvalidBeneficiary` | No conflict exists or already resolved | File a new conflict first |
| `VaultNotFound` | Vault does not exist | Verify vault ID |

## Integration with Other Features

### Release Process
- Conflicts do not block release
- Conflicts are informational for audit trail
- Release proceeds normally even with pending conflicts

### Multi-Beneficiary Splits
- Conflicts apply to primary beneficiary
- Multi-beneficiary splits are not affected
- Each beneficiary can file independent claims

### Dispute Resolution (Issue #399)
- Conflicts are separate from disputes
- Disputes block release; conflicts do not
- Both can exist independently

## Examples

### Example 1: File and Resolve Conflict

```rust
// Beneficiary files conflict claim
let reason = String::from_str(&env, "Another party claims to be beneficiary");
client.file_beneficiary_conflict(&vault_id, &reason)?;

// Admin reviews and resolves
client.resolve_beneficiary_conflict(&vault_id, &beneficiary)?;

// Check resolution
if let Some(conflict) = client.get_beneficiary_conflict(&vault_id) {
    match conflict.resolution {
        ConflictResolution::Approved(addr) => println!("Approved: {}", addr),
        _ => println!("Not resolved"),
    }
}
```

### Example 2: Multiple Claims

```rust
// First beneficiary files claim
client.file_beneficiary_conflict(&vault_id, &reason1)?;

// Second beneficiary files claim
client.file_beneficiary_conflict(&vault_id, &reason2)?;

// Check all claims
if let Some(conflict) = client.get_beneficiary_conflict(&vault_id) {
    for claim in conflict.claims.iter() {
        println!("Claimant: {}, Reason: {}", claim.claimant, claim.reason);
    }
}
```

### Example 3: Query Conflict Status

```rust
match client.get_beneficiary_conflict(&vault_id) {
    Some(conflict) => {
        println!("Conflict exists with {} claims", conflict.claims.len());
        match conflict.resolution {
            ConflictResolution::Pending => println!("Awaiting resolution"),
            ConflictResolution::Approved(addr) => println!("Approved: {}", addr),
            ConflictResolution::Rejected => println!("Rejected"),
        }
    }
    None => println!("No conflict"),
}
```

## Testing

Comprehensive tests are included in `contracts/ttl_vault/src/test.rs`:

- `test_file_beneficiary_conflict_beneficiary_only` - Validates beneficiary-only access
- `test_file_beneficiary_conflict_owner_fails` - Ensures owner cannot file
- `test_file_beneficiary_conflict_empty_reason_fails` - Tests reason validation
- `test_resolve_beneficiary_conflict_admin_only` - Validates admin-only access
- `test_resolve_beneficiary_conflict_non_admin_fails` - Ensures non-admin cannot resolve
- `test_resolve_beneficiary_conflict_no_conflict_fails` - Tests error handling
- `test_get_beneficiary_conflict_not_set` - Tests query when not set
- `test_file_multiple_beneficiary_conflicts` - Tests multiple claims
- `test_beneficiary_conflict_stores_timestamp` - Validates timestamp storage
- `test_beneficiary_conflict_emits_event` - Validates event emission

## Security Considerations

1. **Beneficiary-Only Filing**: Only beneficiaries can file claims
2. **Admin-Only Resolution**: Only administrators can resolve conflicts
3. **Immutable Claims**: Claims cannot be modified after filing
4. **Audit Trail**: All claims and resolutions are recorded on-chain
5. **No Blocking**: Conflicts don't block vault operations

## Future Enhancements

- Voting-based conflict resolution (multiple admins vote)
- Time-based auto-resolution (if not resolved within X days)
- Beneficiary acceptance of resolution
- Conflict appeal mechanism
- Integration with legal document anchoring
