# Plan 18: Profile UI

## Summary

Profile screens display user information, activity statistics, friend status, and enable users to edit their own profiles. The screens handle viewing your own profile, editing profile details, and viewing other users' profiles with appropriate friend management actions.

## Screens

1. **Own Profile** - View your own profile with edit access
2. **Edit Profile** - Form to update profile information
3. **Other User Profile** - View another user's profile with friend actions

## ASCII Wireframe - Own Profile

```
┌─────────────────────────────────────┐
│  ← Profile                  ⚙️  ✏️  │
├─────────────────────────────────────┤
│                                     │
│       ┌───────────────┐             │
│       │               │             │
│       │   [Avatar]    │             │
│       │               │             │
│       └───────────────┘             │
│                                     │
│         John Doe                    │
│         @john_doe                   │
│                                     │
│  "Walking towards better health!"   │
│                                     │
│  📍 San Francisco, CA               │
│  📅 Joined Jan 2025                 │
│                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │   124    │ │    45    │ │  12  ││
│  │ Friends  │ │  Groups  │ │Badges││
│  └──────────┘ └──────────┘ └──────┘│
│                                     │
│  This Week's Activity               │
│  ─────────────────────────────      │
│  ┌─────────────────────────────┐   │
│  │ 64,638 steps                │   │
│  │ 51.7 km                     │   │
│  │ 9,234 avg/day               │   │
│  │ 🔥 12 day streak            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Achievements                       │
│  ─────────────────────────────      │
│  🏅 100K Club  🏅 7-Day Warrior     │
│  🏅 First 10K  🏅 Social Butterfly  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      View All Badges        │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Edit Profile Screen

```
┌─────────────────────────────────────┐
│  ✕ Edit Profile            Save     │
├─────────────────────────────────────┤
│                                     │
│       ┌───────────────┐             │
│       │               │             │
│       │   [Avatar]    │             │
│       │               │             │
│       └───────────────┘             │
│       Change Photo                  │
│                                     │
│  Profile Information                │
│  ─────────────────────────────      │
│  ┌─────────────────────────────┐   │
│  │ Display Name                │   │
│  │ John Doe                    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Username                    │   │
│  │ @john_doe                   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Bio                         │   │
│  │ Walking towards better...   │   │
│  │ ________________________    │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Location (optional)         │   │
│  │ San Francisco, CA           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Privacy                            │
│  ─────────────────────────────      │
│  ┌─────────────────────────────┐   │
│  │ Profile Visibility          │   │
│  │ Public               →      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Activity Visibility         │   │
│  │ Friends Only         →      │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Other User Profile Screen

```
┌─────────────────────────────────────┐
│  ← Sarah Johnson            ⋮       │
├─────────────────────────────────────┤
│                                     │
│       ┌───────────────┐             │
│       │               │             │
│       │   [Avatar]    │             │
│       │               │             │
│       └───────────────┘             │
│                                     │
│         Sarah Johnson               │
│         @sarah.j                    │
│         Friends since Feb 2025      │
│                                     │
│  "Morning walks = clear mind!"      │
│                                     │
│  📍 Oakland, CA                     │
│  📅 Joined Dec 2024                 │
│                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────┐│
│  │   237    │ │    12    │ │  18  ││
│  │ Friends  │ │  Groups  │ │Badges││
│  └──────────┘ └──────────┘ └──────┘│
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Remove Friend          │   │
│  └─────────────────────────────┘   │
│                                     │
│  This Week's Activity               │
│  ─────────────────────────────      │
│  ┌─────────────────────────────┐   │
│  │ 78,432 steps                │   │
│  │ 62.7 km                     │   │
│  │ 11,204 avg/day              │   │
│  │ 🔥 24 day streak            │   │
│  └─────────────────────────────┘   │
│                                     │
│  Mutual Groups (2)                  │
│  ─────────────────────────────      │
│  🏆 Morning Walkers                 │
│  🏆 Weekend Warriors                │
│                                     │
│  Achievements                       │
│  ─────────────────────────────      │
│  🏅 500K Club  🏅 30-Day Warrior    │
│  🏅 First 10K  🏅 Group Leader      │
│                                     │
└─────────────────────────────────────┘
```

## User Profile States

### Not Friends - Sent Request

```
│  ┌─────────────────────────────┐   │
│  │    Friend Request Sent      │   │
│  └─────────────────────────────┘   │
```

### Not Friends - Received Request

```
│  ┌─────────────────────────────┐   │
│  │      Accept Request         │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │      Decline Request        │   │
│  └─────────────────────────────┘   │
```

### Not Friends - No Request

```
│  ┌─────────────────────────────┐   │
│  │      Add Friend             │   │
│  └─────────────────────────────┘   │
```

### Privacy Restricted

```
│  ┌─────────────────────────────┐   │
│  │ This profile is private     │   │
│  │ Add as friend to view       │   │
│  └─────────────────────────────┘   │
```

## Components

- `Avatar.Image` (profile photo)
- `Text` (name, username, bio, stats)
- `Card` (stats cards, activity summary)
- `Button` (edit, add friend, remove friend)
- `IconButton` (settings, menu, change photo)
- `Chip` (achievements badges)
- `TextInput` (edit profile fields)
- `Menu` (profile options: report, block)
- `ImagePicker` from expo-image-picker

## API Calls

```typescript
GET /api/users/me // Get own profile
GET /api/users/{id} // Get other user profile
PUT /api/users/me // Update own profile
GET /api/users/{id}/stats // Get user's stats
GET /api/users/{id}/achievements // Get user's achievements
GET /api/users/{id}/mutual-groups // Get mutual groups
POST /api/users/me/avatar // Upload profile photo
GET /api/friends/status/{userId} // Get friend status with user
```

## State Management

**Local State:**
- `isEditing: boolean`
- `displayName: string`
- `username: string`
- `bio: string`
- `location: string`
- `avatarUri: string | null`
- `hasChanges: boolean`

**Global State:**
```typescript
interface UserStore {
  currentUser: User;
  viewedUser: User | null;
  updateProfile: (data: UpdateProfileDto) => Promise<void>;
  uploadAvatar: (uri: string) => Promise<string>;
  fetchUserProfile: (userId: string) => Promise<User>;
  fetchUserStats: (userId: string) => Promise<UserStats>;
}

interface FriendsStore {
  getFriendStatus: (userId: string) => Promise<FriendStatus>;
  sendFriendRequest: (userId: string) => Promise<void>;
  acceptFriendRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
}

type FriendStatus = 'none' | 'sent' | 'received' | 'friends';
```

## Interactions

1. **View Own Profile**: Display profile with edit button
2. **Tap Edit Button**: Navigate to Edit Profile screen
3. **Change Photo**: Open image picker, upload to Supabase Storage
4. **Edit Fields**: Update form fields with validation
5. **Save Profile**: Validate, submit changes, show success message
6. **Cancel Edit**: Discard changes, show confirmation if modified
7. **View Other Profile**: Fetch user data based on friend status and privacy
8. **Add Friend**: Send friend request, update button state
9. **Accept Request**: Accept friend request, update UI
10. **Remove Friend**: Show confirmation, remove friendship
11. **Tap Stats Card**: Navigate to detailed stats/history
12. **Tap Mutual Group**: Navigate to group detail
13. **Tap Achievement Badge**: Show achievement details modal
14. **Tap Menu**: Show options (Report User, Block User)

## Validation Rules

- Display name: Required, 1-50 characters
- Username: Required, 3-30 characters, alphanumeric + underscore, unique
- Bio: Optional, max 200 characters
- Location: Optional, max 100 characters
- Avatar: Max 5MB, image formats only (jpg, png, webp)

## Privacy Considerations

- Respect user privacy settings
- Hide activity if profile is private and not friends
- Show limited info for non-friends based on settings
- Mutual groups only visible to friends
- Achievements visibility based on privacy settings

## Acceptance Criteria

- [ ] Own profile displays all information
- [ ] Can edit profile information
- [ ] Can upload/change profile photo
- [ ] Profile photo uploaded to Supabase Storage
- [ ] Changes saved successfully
- [ ] Validation errors displayed
- [ ] Other user profiles display correctly
- [ ] Friend status accurately shown
- [ ] Can send friend request
- [ ] Can accept/decline friend request
- [ ] Can remove friend with confirmation
- [ ] Privacy settings respected
- [ ] Stats calculated correctly
- [ ] Achievements displayed
- [ ] Mutual groups shown for friends
- [ ] Menu options work (report, block)
- [ ] Loading states shown while fetching
- [ ] Error handling for failed requests

