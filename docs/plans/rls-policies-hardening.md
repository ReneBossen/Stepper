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
1. `users`
2. `user_preferences`
3. `step_entries`
4. `friendships`
5. `groups` ✅ done on this branch
6. `group_memberships` ✅ done on this branch
7. `group_join_codes` ✅ done on this branch
8. `invite_codes` — **next**
9. `activity_feed`
10. `notifications`

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

## Remaining work on this branch

### 1. Table 8: `invite_codes` (next in the dialog)

**Status:** User flagged this as a trouble area (part of tables "5, 6, 7, 8") but we ran out of time to dig in. The existing policies look reasonable on paper:

- RLS enabled.
- SELECT/INSERT/UPDATE/DELETE all scoped to `auth.uid() = user_id`.
- Validation bypass via `validate_invite_code()` SECURITY DEFINER function (created in `docs/migrations/009_create_invite_codes_table.sql`).

**Action for next agent:**
1. **Ask the user what specific bug they're hitting on `invite_codes`.** Do not skip this step. The policies look correct, so either the bug is in the `validate_invite_code()` function body, in the API layer, or in the mobile client. Figure out which before proposing changes.
2. If the user confirms the policies are fine and the bug is elsewhere, mark table 8 as verified and move to the remaining tables.
3. Remember: the pattern for user-owned resources with controlled read access via SECURITY DEFINER is exactly what `invite_codes` already does. Don't break it without a specific reason.

### 2. Follow-ups on the groups cluster (flagged but not fixed)

Neither blocks merging this branch but both should become their own commits on this branch before it's PR'd:

- **`group_memberships` DELETE for owner.** Current policy lets an owner `DELETE` their own membership row even if the group has other members, orphaning the group. The service-layer `LeaveGroupAsync` already blocks this, but the DB policy should match. Fix: either drop the `user_id = auth.uid()` DELETE policy and route leave through a `leave_group` RPC, or add a check constraint. The user already agreed "owners cannot leave without transferring ownership" semantics are desired.
- **`group_join_codes.join_code` uniqueness.** The table has `UNIQUE (group_id)` but not `UNIQUE (join_code)`. `join_group_by_code` picks one with `LIMIT 1` if there's a collision — silently unreachable for the loser. Add `UNIQUE (join_code)` in a migration. Need to check for existing duplicates first and resolve them.

### 3. Remaining tables (dialog-driven)

The user explicitly wants to work through each remaining table in a conversation, not have an agent draft all policies at once. Order suggestion:

1. **`invite_codes`** (table 8) — highest priority per the initial scope
2. **`users`** (table 1) — high impact, many policies
3. **`user_preferences`** (table 2)
4. **`step_entries`** (table 3)
5. **`friendships`** (table 4)
6. **`activity_feed`** (table 9)
7. **`notifications`** (table 10)

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
- Don't touch tables 1–4, 9, 10 without first running the dialog.
- Don't add backwards-compatibility shims for the dropped direct-INSERT policies on `groups` and `group_memberships`. The RPCs are the only path now, and that's intentional.
- Don't rewrite `is_group_member` back to "any status". It used to mean that, and callers relied on active-only semantics. `has_group_membership` is the explicit "any status" variant.
- Don't introduce a second membership table for pending requests. The user chose `status` on the existing table; that decision is made.
- Don't widen `groups` SELECT back to fully open. The previous justification (join-by-code lookup) no longer applies now that `group_join_codes` is a separate table with its own RLS.
