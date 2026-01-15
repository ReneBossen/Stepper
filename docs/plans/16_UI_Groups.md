# Plan 16: Groups UI

## Summary

The Groups screens display group listings, detailed group views with leaderboards, and enable users to view their groups and competition standings. Shows current competition period, member rankings, and provides access to group management.

## Screens

1. **Groups List** - All user's groups
2. **Group Detail** - Single group with leaderboard

## ASCII Wireframe - Groups List

```
┌─────────────────────────────────────┐
│  Groups                  ➕ Create   │
├─────────────────────────────────────┤
│                                     │
│  My Groups (3)                      │
│  ─────────────────────────────      │
│  ┌─────────────────────────────┐   │
│  │ 🏆 Morning Walkers          │   │
│  │ 12 members • Weekly         │   │
│  │                             │   │
│  │ You're #3  •  9,234 steps   │   │
│  │ 1. Sarah (12,547)           │   │
│  │ 2. Mike (11,892)            │   │
│  │ 3. You (9,234)       →      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🏆 Weekend Warriors         │   │
│  │ 8 members • Daily           │   │
│  │                             │   │
│  │ You're #2  •  8,547 steps   │   │
│  │ 1. Tom (10,234)             │   │
│  │ 2. You (8,547)       →      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Join a Group           │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Group Detail Screen

```
┌─────────────────────────────────────┐
│  ← Morning Walkers          ⚙️  ⋮   │
├─────────────────────────────────────┤
│                                     │
│  🏆 Morning Walkers                 │
│  12 members • Weekly Competition    │
│  This Week: Jan 8 - Jan 14          │
│                                     │
│  Leaderboard                        │
│  ─────────────────────────────      │
│  ┌─────────────────────────────┐   │
│  │ 🥇 1. Sarah Johnson         │   │
│  │    12,547 steps             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🥈 2. Mike Chen              │   │
│  │    11,892 steps             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🥉 3. You (John Doe)         │   │
│  │    9,234 steps    👆 +2     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 4. Emily Davis               │   │
│  │    8,765 steps    👇 -1     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 5. Alex Kim                  │   │
│  │    7,234 steps    ─ 0       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Invite Members         │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Components

- `Card` (group cards on list)
- `List.Item` (leaderboard entries)
- `Avatar.Image` (member avatars)
- `Chip` (competition type badge)
- `Badge` (rank change indicators)
- `Menu` (group options - settings, leave)
- `FAB` (create/join group)

## API Calls

```typescript
GET /api/groups // Get user's groups
GET /api/groups/{id} // Get group details
GET /api/groups/{id}/leaderboard // Get current leaderboard
GET /api/groups/{id}/members // Get group members
POST /api/groups/{id}/invite // Invite members
```

## State Management

**Local State:**
- `selectedGroup: Group | null`
- `isRefreshing: boolean`

**Global State:**
```typescript
interface GroupsStore {
  myGroups: Group[];
  selectedGroupLeaderboard: LeaderboardEntry[];
  fetchMyGroups: () => Promise<void>;
  fetchLeaderboard: (groupId: string) => Promise<void>;
}
```

## Interactions

1. **Tap Group Card**: Navigate to Group Detail
2. **Tap Create Button**: Navigate to Create Group screen
3. **Tap Join Button**: Navigate to Join Group screen
4. **Tap Settings Icon**: Open group settings (admin/owner only)
5. **Tap Menu (⋮)**: Show options (View Info, Leave Group)
6. **Tap Invite Members**: Show member invitation modal
7. **Tap Leaderboard Entry**: Navigate to member's profile
8. **Pull to Refresh**: Reload groups and leaderboards
9. **Real-time Updates**: Listen for leaderboard changes via Supabase

## Acceptance Criteria

- [ ] Groups list shows all user's groups
- [ ] Group cards show preview of top 3 leaderboard
- [ ] User's rank highlighted in preview
- [ ] Group detail shows full leaderboard
- [ ] Leaderboard shows rank changes (up/down/same)
- [ ] Competition period clearly displayed
- [ ] Medal icons for top 3 (🥇🥈🥉)
- [ ] Real-time leaderboard updates
- [ ] Pull to refresh works
- [ ] Empty state for no groups
- [ ] Can navigate to create/join flows
- [ ] Admin/owner sees settings icon
