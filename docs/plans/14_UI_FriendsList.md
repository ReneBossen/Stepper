# Plan 14: Friends List UI

## Summary

The Friends List screen shows all accepted friends with their current step counts, activity status, and provides access to friend requests and discovery features. It includes a feed of friend achievements and quick comparison of today's steps.

## ASCII Wireframe

```
┌─────────────────────────────────────┐
│  Friends                  🔍  ➕     │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Friend Requests (3)    →    │   │
│  └─────────────────────────────┘   │
│                                     │
│  My Friends (24)                    │
│  ─────────────────────────────      │
│  ┌─────────────────────────────┐   │
│  │ 👤 Sarah Johnson            │   │
│  │ 12,547 steps today          │   │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓ 125%         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Mike Chen          📊    │   │
│  │ 9,234 steps today           │   │
│  │ ▓▓▓▓▓▓▓▓▓░░░░ 92%          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Emily Davis               │   │
│  │ 6,892 steps today           │   │
│  │ ▓▓▓▓▓▓░░░░░░░ 69%          │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 👤 Alex Kim                  │   │
│  │ No activity today           │   │
│  │ ░░░░░░░░░░░░░ 0%            │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│  🏠   📊   👥   🏆   ⚙️            │
└─────────────────────────────────────┘
```

## Components

- `List.Item` with `Avatar.Image` (friend entries)
- `Badge` (friend requests count)
- `ProgressBar` (friend's goal progress)
- `SearchBar` (filter friends)
- `FAB` (floating add button)
- `EmptyState` (no friends yet)

## API Calls

```typescript
GET /api/friends // Get all accepted friends
GET /api/friends/requests/incoming // Pending requests count
GET /api/friends/{friendId}/steps // Friend's today steps
```

## Interactions

1. **Tap Friend Requests Banner**: Navigate to Friend Requests screen
2. **Tap Search Icon**: Show search bar to filter friends
3. **Tap Add Button**: Navigate to Friend Discovery
4. **Tap Friend Item**: Navigate to friend's profile
5. **Tap Stats Icon**: View friend's step history
6. **Pull to Refresh**: Reload friends and their steps
7. **Long Press Friend**: Show options (View Profile, Remove Friend)

## Acceptance Criteria

- [ ] Friends list shows all accepted friends
- [ ] Each friend shows today's step count
- [ ] Progress bars show goal completion
- [ ] Friend requests badge shows count
- [ ] Search/filter friends by name
- [ ] Pull to refresh updates data
- [ ] Empty state for no friends
- [ ] Real-time step updates
