# Plan 6: Friend Discovery

## Summary

This plan implements the Friend Discovery feature to help users find and connect with other users. The feature includes user search by username/display name, QR code generation for each user, QR code scanning to add friends, and shareable invite links with deep linking support. This feature builds on Plan 4 (Friends) by providing multiple discovery mechanisms to initiate friend requests.

## Affected Feature Slices

- **Friends**: Extended with discovery endpoints (search, QR code, invite links)
- **Users**: Search index on display_name, new QR code identifier field
- **Common**: Deep link URL configuration
- **New Discovery subfolder**: QR generation and invite code management

## Proposed Types

| Type Name | Feature/Location | Responsibility |
|-----------|------------------|----------------|
| FriendDiscoveryController | Friends/Discovery/ | HTTP endpoints for discovery operations |
| IFriendDiscoveryService | Friends/Discovery/ | Interface for discovery business logic |
| FriendDiscoveryService | Friends/Discovery/ | Search, QR, and invite code logic |
| IInviteCodeRepository | Friends/Discovery/ | Interface for invite code data access |
| InviteCodeRepository | Friends/Discovery/ | Supabase data access for invite codes |
| InviteCode | Friends/Discovery/ | Domain model for invite code |
| InviteCodeType | Friends/Discovery/ | Enum: QrCode, ShareLink |
| SearchUsersRequest | Friends/Discovery/DTOs | Request DTO for user search |
| SearchUsersResponse | Friends/Discovery/DTOs | Response DTO for search results |
| UserSearchResult | Friends/Discovery/DTOs | DTO for individual search result |
| QrCodeResponse | Friends/Discovery/DTOs | Response DTO for QR code data |
| GenerateInviteLinkResponse | Friends/Discovery/DTOs | Response DTO for invite link |

## Implementation Steps

1. **Extend Users table with unique identifier for QR**:
   ```sql
   ALTER TABLE users ADD COLUMN qr_code_id TEXT UNIQUE;
   UPDATE users SET qr_code_id = encode(gen_random_bytes(8), 'hex') WHERE qr_code_id IS NULL;
   ALTER TABLE users ALTER COLUMN qr_code_id SET NOT NULL;
   ALTER TABLE users ALTER COLUMN qr_code_id SET DEFAULT encode(gen_random_bytes(8), 'hex');
   ```

2. **Add search index on users.display_name**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_trgm;
   CREATE INDEX idx_users_display_name_trgm ON users USING GIN (display_name gin_trgm_ops);
   CREATE INDEX idx_users_display_name_lower ON users (LOWER(display_name));
   ```

3. **Create invite_codes table**:
   ```sql
   CREATE TABLE invite_codes (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
       code TEXT NOT NULL UNIQUE,
       type TEXT NOT NULL CHECK (type IN ('qr_code', 'share_link')),
       expires_at TIMESTAMPTZ,
       max_usages INTEGER,
       usage_count INTEGER NOT NULL DEFAULT 0,
       created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **Create RLS policies for invite_codes**

5. **Create database functions**:
   - `search_users()` - Search with friendship status
   - `validate_invite_code()` - Validate and redeem codes
   - `get_user_by_qr_code()` - Lookup user by QR ID

6. **Create Friends/Discovery folder structure** with controllers, services, repositories

7. **Implement search functionality** with trigram matching

8. **Implement QR code generation** using QRCoder NuGet package

9. **Implement invite link generation** with expiration and usage limits

10. **Configure deep link URL format**: `walkingapp://invite/{code}`

11. **Register services** in Program.cs

12. **Implement FriendDiscoveryController endpoints**:
    - `GET /api/friends/discovery/search?query=`
    - `GET /api/friends/discovery/qr-code`
    - `GET /api/friends/discovery/qr-code/{qrCodeId}`
    - `POST /api/friends/discovery/invite-links`
    - `POST /api/friends/discovery/redeem`

## Dependencies

| Package | Version | Justification |
|---------|---------|---------------|
| QRCoder | Latest stable | QR code generation library |

- Plan 1 (Supabase Integration) must be completed
- Plan 2 (Users) must be completed
- Plan 4 (Friends) must be completed

## Database Changes

**Modified Table**: `users`
- Add column: `qr_code_id TEXT UNIQUE NOT NULL`

**New Table**: `invite_codes`

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PRIMARY KEY |
| user_id | UUID | NOT NULL, REFERENCES auth.users(id) |
| code | TEXT | NOT NULL, UNIQUE |
| type | TEXT | CHECK IN (qr_code, share_link) |
| expires_at | TIMESTAMPTZ | nullable |
| max_usages | INTEGER | nullable |
| usage_count | INTEGER | NOT NULL, DEFAULT 0 |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**New Indexes**: Trigram index on display_name, indexes on invite codes

## Tests

**Unit Tests**:
- Search returns matching users
- Search respects privacy settings
- QR code generation returns valid data
- Invite link respects expiry
- Cannot redeem expired codes

**Integration Tests**:
- Search endpoint returns users with friendship status
- QR code endpoint returns valid QR data
- Invite link creation works
- Redeem creates friend request

## Acceptance Criteria

- [ ] Users can search for other users by display name
- [ ] Search results show friendship status
- [ ] Search respects privacy settings
- [ ] Each user has a unique QR code
- [ ] QR codes can be scanned to add friends
- [ ] Users can generate shareable invite links
- [ ] Invite links support expiration and usage limits
- [ ] Redeeming links sends friend requests
- [ ] Deep links open app and trigger friend request

## Risks and Open Questions

| Risk/Question | Mitigation/Answer |
|--------------|-------------------|
| Search performance with many users | Use GIN trigram index, limit result size |
| QR code security | Use cryptographically random IDs |
| Invite link abuse | Rate limit creation, allow revocation |
| Privacy concerns | Implement privacy settings in Plan 8 |
