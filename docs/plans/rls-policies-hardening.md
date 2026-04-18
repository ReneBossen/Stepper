# RLS Policies Hardening

**Branch:** `fix/rls-policies-hardening`
**Goal:** Audit every RLS policy in the Supabase database and make them as restrictive as possible while still allowing legitimate access. Driven by a backlog of bugs rooted in RLS (join flows failing, infinite recursion, over-permissive SELECTs).

This plan is the handoff for subsequent agents picking up where the initial session stopped.

---

## Starting state

The Supabase schema is split across two locations:
- `supabase/migrations/` — the authoritative, Supabase-CLI-managed history. All new migrations land here.
- `docs/migrations/` — the original hand-applied baseline (numbered `000_` through `023_`). These are **already applied** to prod and not tracked by the Supabase CLI. **Do not move or re-run them** without first marking them applied via `supabase migration repair`. A follow-up task to consolidate is out of scope for this branch.

Tables with RLS enabled (10 total):
1. `users` ✅ done on this branch
2. `user_preferences` ✅ done on this branch
3. `step_entries`
4. `friendships`
5. `groups` ✅ done on this branch
6. `group_memberships` ✅ done on this branch
7. `group_join_codes` ✅ done on this branch
8. `invite_codes` ✅ done on this branch
9. `activity_feed`
10. `notifications`

Also done on this branch: **`users`** (table 1) ✅, **`user_preferences`** (table 2) ✅

---

## What's already done on this branch

Commit `b2493df` — `feat(groups): harden RLS, add pending membership + join RPCs`.

Migration `supabase/migrations/20260413130000_harden_groups_rls_and_join_rpc.sql` rewires tables 5/6/7:

- `group_memberships.status` column added (`'active' | 'pending'`, default `'active'`). Existing rows default-backfill to `'active'`.
- Helper functions `is_group_member`, `is_group_admin`, `is_group_owner`, `get_user_group_ids` updated to require `status='active'`.
- New helper `has_group_membership` (any status) used only by the groups SELECT policy so pending users can still load the group row.
- `groups` SELECT tightened from `true` (any authenticated) → `is_public OR has_group_membership(id, auth.uid())`.
- `groups` INSERT policy dropped. Group creation is RPC-only via the existing `create_group_with_owner`.
- BEFORE UPDATE trigger on `groups` rejects changes to `id`, `created_by_id`, `created_at`.
- `group_memberships` INSERT policy dropped. Membership creation is RPC-only.
- `group_memberships` SELECT augmented with a second policy `user_id = auth.uid()` so users always see their own row (including pending).
- `create_group_with_owner` updated to set `status='active'` explicitly on the owner row.
- New SECURITY DEFINER RPCs:
  - `join_group_by_code(p_code text)` — validates code, enforces `max_members` and `require_approval`, inserts `'active'` or `'pending'`.
  - `join_public_group(p_group_id uuid)` — same for the public-by-id path, rejects private groups.
  - `admin_add_member(p_group_id uuid, p_user_id uuid)` — lets an admin directly add a user (used by the existing "invite member" feature).

Backend (`Stepper.Api/Groups/`):
- `MembershipStatus` enum added.
- `GroupMembership.Status`, `GroupMembershipEntity.status` column mapping, `GroupResponse.Status`, `GroupMemberResponse.Status` all plumbed.
- `GroupService.JoinByCodeAsync`, `JoinGroupAsync`, `InviteMemberAsync`, `ApproveMemberAsync` rewritten to use the new RPCs.
- Role-gated methods (`UpdateGroup`, `DeleteGroup`, `RemoveMember`, `GetMembers`, `GetLeaderboard`, `RegenerateJoinCode`, `UpdateMemberRole`) switched to a new `GetActiveMembershipOrThrowAsync` helper that rejects pending users.

Mobile (`Stepper.Mobile/src/`):
- `MembershipStatus` and `JoinGroupResult` exported from `groupsStore`.
- `groupsApi.joinGroup` / `joinGroupByCode` return `{ groupId, status }`.
- `JoinGroupScreen` and `GroupsListScreen` show a "request sent" alert when status is `pending`.
- `GroupMember.status` surfaced so the manage-members UI can badge pending members.

Tests: 799 unit + 35 integration + 2346 mobile, all green at commit time.

---

## Design decisions already made (do not re-litigate)

These were agreed with the user in the initial dialog. Follow them unless the user explicitly reopens them.

1. **Approval-required groups use `status='pending'` on `group_memberships`**, not a separate table. The existing `ApproveMemberAsync` endpoint flips the row to active.
2. **Max members is enforced twice** (in the RPC + in the API layer). The user explicitly said "two times is good."
3. **`groups` SELECT** is `is_public OR has_group_membership`. A user with *only* a join code cannot preview the group — they commit by joining. No separate preview RPC.
4. **`group_join_codes` SELECT policy stays members-only.** Join validation happens server-side inside `join_group_by_code`, not via a client SELECT.
5. **Direct INSERT on `groups` and `group_memberships` is revoked.** All writes go through SECURITY DEFINER RPCs.
6. **Migrations are the source of truth.** The user is not editing policies via the Supabase dashboard. Inventory from migrations is authoritative.
7. **`docs/migrations/` consolidation into `supabase/migrations/`** is a follow-up, not part of this branch. Do not mix it in.
8. **Scope discipline: one table at a time, in a dialog.** The user wants to go through each remaining table interactively and confirm intent before any SQL is written. Do not unilaterally draft policies for tables 1–4, 8, 9, 10.

---

## Deployment ordering (when this branch ships)

Deploy order is load-bearing. Both commits must land together or in sequence:

1. **Apply migration first.** `supabase db push` or run the SQL via the dashboard. Until the new RPCs exist, the backend cannot join groups.
2. **Deploy backend second.** The old backend still does direct INSERTs into `group_memberships`, which the migration revokes — so if the migration is applied but the old backend is still running, `InviteMember` and any legacy join path will 42501.
3. **Deploy mobile last.** The new mobile expects `{ groupId, status }` from the join endpoints. An older mobile client will still work (it just ignores the new `status` field) — that's why mobile is flexible in ordering, but newer-mobile-with-older-backend would break.

Smoke-test after deploy:
- Create a group → confirm owner membership is `status='active'`.
- Join a public group → `status='active'`.
- Join a private group via code → `status='active'`.
- Toggle `require_approval=true` on a group, join via code → `status='pending'`, UI shows "request sent" alert.
- As admin of that group, approve the pending member → row flips to active.
- Try to directly INSERT into `group_memberships` with a user's JWT → fails with 42501.

---

## Before shipping this branch — master checklist

This is the consolidated list of everything that must happen before the whole RLS hardening branch is merged and deployed. It grows as each table is hardened. **Always re-read this section before cutting a release PR.**

### Pre-deploy pre-checks (run against prod, must all return 0)

Run these **before** applying any migration on this branch. If any return non-zero, resolve the underlying data before proceeding — do not force-apply.

1. **`invite_codes` data shape** (migration `20260413140000_*` will add CHECK constraints):
   ```sql
   SELECT count(*) FROM invite_codes
   WHERE usage_count < 0
      OR (max_usages IS NOT NULL AND max_usages <= 0)
      OR (expires_at IS NOT NULL AND expires_at <= created_at);
   ```

2. **`users` without a `user_preferences` row** (migration `20260413150000_*` will stop treating missing prefs as discoverable):
   ```sql
   SELECT count(*) FROM users u
   LEFT JOIN user_preferences up ON up.id = u.id
   WHERE up.id IS NULL;
   ```
   If non-zero, backfill **before** applying:
   ```sql
   INSERT INTO user_preferences (id)
   SELECT u.id FROM users u
   LEFT JOIN user_preferences up ON up.id = u.id
   WHERE up.id IS NULL;
   ```

3. **`user_preferences` step goal range** (migration `20260418100000_*` will add CHECK constraint):
   ```sql
   SELECT count(*) FROM user_preferences
   WHERE daily_step_goal < 1 OR daily_step_goal > 1000000;
   ```

4. *(Add rows here as each remaining table is hardened.)*

### Deployment ordering

Apply in this order. Nothing else on the branch is order-sensitive between tables — each migration is independent within the branch, but everything must ship as a unit because the backend and mobile commits on the branch assume the migrations have been applied.

1. **Apply all new `supabase/migrations/2026041313*` and later files.** `supabase db push` or run via the dashboard in timestamp order.
2. **Deploy backend.** Old backend still does direct INSERTs into `group_memberships`, which the groups migration revokes. If the migration lands without the new backend, `InviteMember` and any legacy join path will 42501.
3. **Deploy mobile last.** New mobile expects `{ groupId, status }` from the join endpoints. Older-mobile-with-newer-backend works (mobile just ignores the `status` field); the reverse breaks.

### Post-deploy smoke tests

Groups cluster (from the initial hardening):
- Create a group → owner membership is `status='active'`.
- Join a public group → `status='active'`.
- Join a private group via code → `status='active'`.
- Toggle `require_approval=true`, join via code → `status='pending'`, UI shows "request sent".
- Admin approves the pending member → row flips to active.
- Direct INSERT into `group_memberships` with a user's JWT → 42501.

Invite codes:
- Generate an invite code → row created with `usage_count=0`.
- Redeem it → `validate_invite_code` increments atomically; second redeem past `max_usages` is rejected.
- Direct `UPDATE invite_codes SET usage_count = 0 WHERE user_id = auth.uid()` → rejected (policy dropped).

Users (table 1):
- New signup → `user_preferences.privacy_find_me = 'private'`.
- Friend search by a stranger → the new user does **not** appear.
- New user sets `privacy_find_me = 'public'` → appears in search.
- Accept a friend request → friend sees profile via the friends SELECT policy even while `'private'`.
- `UPDATE users SET qr_code_id = '...' WHERE id = auth.uid()` as authenticated → raises `users.qr_code_id is immutable`.
- `UPDATE users SET display_name = 'x' WHERE id = auth.uid()` → succeeds; `updated_at` bumps.
- Existing user whose `privacy_find_me` was `'public'` before the migration → still discoverable (existing rows are not flipped).

User preferences (table 2):
- `INSERT INTO user_preferences (id) VALUES (auth.uid())` with user JWT → denied (INSERT policy dropped, grant revoked).
- `UPDATE user_preferences SET created_at = '2020-01-01' WHERE id = auth.uid()` → raises `user_preferences.created_at is immutable`.
- `UPDATE user_preferences SET daily_step_goal = 0 WHERE id = auth.uid()` → CHECK violation.
- `UPDATE user_preferences SET daily_step_goal = 1000001 WHERE id = auth.uid()` → CHECK violation.
- `UPDATE user_preferences SET daily_step_goal = 5000 WHERE id = auth.uid()` → succeeds.
- `UPDATE user_preferences SET notifications_enabled = false WHERE id = auth.uid()` → succeeds.

*(Append smoke tests as each remaining table is hardened.)*

### Groups cluster follow-ups (must become commits on this branch before PR)

See "Follow-ups on the groups cluster" section below. Neither blocks merging individually, but both should ship in the same PR so the hardening story is complete:
- `group_memberships` DELETE for owner — either drop the policy + add `leave_group` RPC, or add a check constraint.
- `group_join_codes.join_code` uniqueness — add `UNIQUE (join_code)` after resolving any existing collisions.

### Test suite gate

Before opening the PR:
- `dotnet build` clean.
- `dotnet test` — all unit + integration tests green.
- `npx jest` from `Stepper.Mobile/` — all mobile tests green.

### Rollback notes

Every migration on this branch is written to be forward-only but safe to re-apply (`DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`). There is no dedicated down-migration script. To roll back a single table, write a new migration that restores the old policy + drops the new trigger/function. **Do not `supabase migration down`** — the hand-applied `docs/migrations/` baseline is not tracked by the Supabase CLI and down-migrations can corrupt state.

---

## Remaining work on this branch

### 1. Table 8: `invite_codes` ✅ done

Migration `supabase/migrations/20260413140000_harden_invite_codes_rls.sql` — audit-driven (no known bug), tightened to match the groups hardening pattern:

- **Dropped UPDATE policy.** Was `auth.uid() = user_id` with no column restriction, letting a user reset their own `usage_count` and bypass `max_usages`. No legitimate client update path — validation increments atomically inside `validate_invite_code`, regeneration is new-row + delete.
- **Pinned `SET search_path = public`** on `validate_invite_code` (SECURITY DEFINER). Previously unpinned; now matches every SECURITY DEFINER in the groups migration.
- **Locked EXECUTE grant**: `REVOKE EXECUTE ... FROM PUBLIC; GRANT EXECUTE ... TO authenticated`. The in-body `auth.uid() IS NULL` check stays as defence-in-depth.
- **CHECK constraints** added: `usage_count >= 0`, `max_usages IS NULL OR max_usages > 0`, `expires_at IS NULL OR expires_at > created_at`.

Backend cleanup in the same commit:
- Removed dead `UpdateAsync` from `IInviteCodeRepository`, `InviteCodeRepository`, and `InviteCodeRepositoryTests`. `FriendDiscoveryService` already uses the `validate_invite_code` RPC; the repo update method had no callers.

Tests: 798 unit (was 799, −1 for the removed UpdateAsync token test) + 35 integration, all green.

**Deployment ordering for this table:** migration-first is safe — old backend still works because the dropped UPDATE policy was unused. Add CHECK constraints may fail if prod has existing violating rows; run this pre-check before applying: `SELECT count(*) FROM invite_codes WHERE usage_count < 0 OR (max_usages IS NOT NULL AND max_usages <= 0) OR (expires_at IS NOT NULL AND expires_at <= created_at);` — must be 0.

### 2. Table 1: `users` ✅ done

Migration `supabase/migrations/20260413150000_harden_users_rls.sql` — audit-driven (no known bug). Three gaps closed:

- **Discovery was opt-out by default.** Old policy `"Anyone can discover users"` treated a missing `user_preferences` row as public, and the column default for `privacy_find_me` was `'public'`. Replaced with `"Discoverable users are findable"` which requires an explicit row with `privacy_find_me IN ('public','partial')`. Column default flipped to `'private'`. **Existing rows are not migrated** — explicit product decision: only new signups go private, current users keep whatever value they have.
- **`search_users` RPC tightened to match.** Dropped the `up.id IS NULL` branch (legacy users without prefs are no longer returned). Signature unchanged, so the .NET caller in `Stepper.Api/Friends/Discovery/` needs no change. Added `REVOKE EXECUTE FROM PUBLIC; GRANT EXECUTE TO authenticated` to match the invite_codes pattern.
- **Immutable column trigger.** New `trg_users_prevent_immutable_updates` rejects changes to `id`, `qr_code_id`, `created_at`. Mirrors `groups_prevent_immutable_column_updates` from the groups migration. `updated_at` stays mutable so `update_users_updated_at` can keep setting it. Backend never touches these columns today; trigger is pure defense-in-depth.
- **Index cleanup.** Dropped `idx_user_preferences_privacy_private` — it was a partial index on `privacy_find_me = 'private'` used by the old "NOT EXISTS private" policy, no longer referenced.

Decisions already made (do not re-litigate):
- Friends SELECT policy (`docs/migrations/004`) stays — it's how a private user remains visible to accepted friends. Not redundant with the new discovery policy.
- INSERT policy stays — `EnsureProfileExistsAsync` creates the row using the user's own JWT, and `WITH CHECK auth.uid() = id` is correct. Not routing through an RPC.
- UPDATE policy stays open at RLS level; immutability is enforced by the trigger, not by revoking UPDATE. Backend still uses `UserRepository.UpdateAsync` unchanged.
- `qr_code_id` is set-once — never regenerates through any path. If a regen feature is ever added, it must go through a SECURITY DEFINER RPC.

No backend or mobile code changes. Tests were not re-run because no C# or TS changed; the trigger can only fire on write paths the existing backend doesn't exercise.

**Deployment ordering for this table:** migration-first is safe. The ordering gotcha is the discovery policy change — see the `users` entry in the pre-deploy checklist below for the required prod pre-check.

### 3. Table 2: `user_preferences` ✅ done

Migration `supabase/migrations/20260418100000_harden_user_preferences_rls.sql` — audit-driven (no known bug). Three gaps closed:

- **Dropped INSERT policy and revoked INSERT grant.** Row creation is handled exclusively by the SECURITY DEFINER trigger `create_default_user_preferences()` (fires AFTER INSERT on `users`). Backend's `EnsureUserPreferencesExistAsync` uses the service role. No authenticated client path needs direct INSERT — allowing it was over-permissive.
- **Immutable column trigger.** New `trg_user_preferences_prevent_immutable_updates` rejects changes to `id` and `created_at`. Mirrors `users_prevent_immutable_column_updates` and `groups_prevent_immutable_column_updates`. `updated_at` stays mutable so `update_user_preferences_updated_at` can keep setting it.
- **CHECK constraint on `daily_step_goal`.** `BETWEEN 1 AND 1000000` — prevents negative, zero, or absurdly large values via direct client calls.

No backend or mobile code changes. The backend's `UpdateAsync` only writes user-controlled fields; the service role bypasses RLS for `EnsureUserPreferencesExistAsync`.

**Deployment ordering for this table:** migration-first is safe — old backend works because it never did direct INSERTs via user JWT. CHECK constraint may fail if prod has existing out-of-range rows; run the pre-check before applying.

### 4. Follow-ups on the groups cluster (flagged but not fixed)

Neither blocks merging this branch but both should become their own commits on this branch before it's PR'd:

- **`group_memberships` DELETE for owner.** Current policy lets an owner `DELETE` their own membership row even if the group has other members, orphaning the group. The service-layer `LeaveGroupAsync` already blocks this, but the DB policy should match. Fix: either drop the `user_id = auth.uid()` DELETE policy and route leave through a `leave_group` RPC, or add a check constraint. The user already agreed "owners cannot leave without transferring ownership" semantics are desired.
- **`group_join_codes.join_code` uniqueness.** The table has `UNIQUE (group_id)` but not `UNIQUE (join_code)`. `join_group_by_code` picks one with `LIMIT 1` if there's a collision — silently unreachable for the loser. Add `UNIQUE (join_code)` in a migration. Need to check for existing duplicates first and resolve them.

### 4. Remaining tables (dialog-driven)

The user explicitly wants to work through each remaining table in a conversation, not have an agent draft all policies at once. Order suggestion:

1. ~~**`user_preferences`** (table 2)~~ ✅ done
2. **`step_entries`** (table 3)
3. **`friendships`** (table 4)
4. **`activity_feed`** (table 9)
5. **`notifications`** (table 10)

For each table, the template that worked in the initial dialog:
1. Read the latest state from migrations (check both `supabase/migrations/` and `docs/migrations/` for overrides).
2. Present current policies in a table + intended access model.
3. List suspected gaps / over-permissive rules.
4. Ask the user:
   - What specific bug are you hitting here?
   - Does the intended access model match reality?
   - Confirm the policy edits before writing SQL.
5. Write one migration per table (or one migration for multiple if they're tightly coupled), stacked after the existing `20260413130000_*` migration.
6. Update backend service/repo code and mobile types as needed.
7. Run full test suite (`dotnet test` + `npx jest` from `Stepper.Mobile/`).

---

## How to pick this up

1. Check you're on `fix/rls-policies-hardening` branched off `master`. If master has moved, rebase.
2. Read this plan end-to-end, then read the latest migration (`supabase/migrations/20260413130000_harden_groups_rls_and_join_rpc.sql`) so you understand the pattern the initial work established.
3. Ask the user which table they want to tackle next and what bug they're seeing. **Do not start writing SQL until they answer.**
4. For each table, keep migrations atomic: one file per logical unit of work, timestamped after the previous, documented with a top-of-file comment explaining why.
5. Run tests after every backend change. The existing tests caught the tuple-shape regression in `GetUserGroupsAsync` during the initial session — trust them.

---

## Things to avoid

- Don't consolidate `docs/migrations/` into `supabase/migrations/` on this branch.
- Don't touch tables 2–4, 9, 10 without first running the dialog.
- Don't add backwards-compatibility shims for the dropped direct-INSERT policies on `groups` and `group_memberships`. The RPCs are the only path now, and that's intentional.
- Don't rewrite `is_group_member` back to "any status". It used to mean that, and callers relied on active-only semantics. `has_group_membership` is the explicit "any status" variant.
- Don't introduce a second membership table for pending requests. The user chose `status` on the existing table; that decision is made.
- Don't widen `groups` SELECT back to fully open. The previous justification (join-by-code lookup) no longer applies now that `group_join_codes` is a separate table with its own RLS.
