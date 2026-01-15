# Plan 12: Home/Dashboard UI

## Summary

The Home/Dashboard screen is the main hub of the Walking App, displayed when users open the app. It shows today's step count, progress toward the daily goal, distance walked, streak information, and a feed of recent friend activity. This is the default tab in the bottom navigation and provides quick access to key stats.

## Screen Purpose

Central dashboard providing at-a-glance view of user's activity and social feed.

## ASCII Wireframe

```
┌─────────────────────────────────────┐
│  Walking App            🔔(2)  ⚙️   │
├─────────────────────────────────────┤
│                                     │
│         Good Morning, John! 👋      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │          8,547              │   │
│  │          steps              │   │
│  │                             │   │
│  │    ●●●●●●●●●○○○ 85%         │   │
│  │    Goal: 10,000 steps       │   │
│  │                             │   │
│  │    📏 6.8 km  🔥 12 days    │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌────────────┐  ┌────────────┐    │
│  │   Weekly   │  │  This Week │    │
│  │   Average  │  │   Total    │    │
│  │            │  │            │    │
│  │   9,234    │  │  64,638    │    │
│  │   steps    │  │  steps     │    │
│  └────────────┘  └────────────┘    │
│                                     │
│  Recent Activity                    │
│  ─────────────────────────────      │
│  👤 Sarah hit 15K steps! 🎉        │
│  2 hours ago                        │
│                                     │
│  👤 Mike joined "Morning Walkers"   │
│  5 hours ago                        │
│                                     │
│  👤 You completed a 7-day streak!   │
│  Yesterday                          │
│                                     │
├─────────────────────────────────────┤
│  🏠   📊   👥   🏆   ⚙️            │
│  Home Steps Friends Groups Settings│
└─────────────────────────────────────┘
```

## Components

**React Native Paper:**
- `Appbar.Header` (top bar with notifications bell and settings)
- `Card` (main step counter card, stats cards)
- `ProgressBar` or custom circular progress
- `Text` (labels, counts, greetings)
- `List.Item` (activity feed items)
- `Avatar.Image` (user avatars in feed)
- `Badge` (notification count)

**React Native Core:**
- `ScrollView` (scrollable content)
- `RefreshControl` (pull to refresh)
- `View` (layout containers)

**Custom Components:**
- `StepCounterCard` - Large card with circular progress
- `StatCard` - Small stat display cards
- `ActivityFeedItem` - Activity feed list item
- `StreakBadge` - Streak counter display

## Navigation

**From:**
- App launch (if authenticated and onboarded)
- Any tab via bottom navigation

**To:**
- Notifications screen (via bell icon)
- Settings screen (via settings icon)
- Steps History screen (tap on main step card)
- User Profile (tap on activity feed avatar)
- Group Detail (tap on group activity)

## API Calls

```typescript
// Get today's steps
GET /api/steps/today
Response: ApiResponse<DailyStepsResponse>
interface DailyStepsResponse {
  date: string;
  totalSteps: number;
  totalDistanceMeters: number;
}

// Get weekly summary
GET /api/steps/daily?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
Response: ApiResponse<StepHistoryResponse>

// Get activity feed
GET /api/activity/feed?limit=10
Response: ApiResponse<ActivityFeedResponse>
interface ActivityFeedResponse {
  items: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'milestone' | 'friend_achievement' | 'group_join' | 'streak';
  userId?: string;
  userName?: string;
  avatarUrl?: string;
  message: string;
  timestamp: string;
}
```

## State Management

**Local State (useState):**
- `isRefreshing: boolean` - Pull to refresh state
- `greeting: string` - Time-based greeting

**Global State (Zustand):**
```typescript
// stepsStore
interface StepsStore {
  todaySteps: number;
  todayDistance: number;
  dailyGoal: number;
  streak: number;
  weeklyAverage: number;
  weeklyTotal: number;
  fetchTodaySteps: () => Promise<void>;
  fetchWeeklySummary: () => Promise<void>;
}

// activityStore (new)
interface ActivityStore {
  feed: ActivityItem[];
  fetchFeed: () => Promise<void>;
}

// userStore
const { displayName, preferences } = useUserStore();
```

## Interactions

1. **On Screen Load**:
   - Fetch today's steps from API
   - Fetch weekly summary
   - Fetch activity feed
   - Calculate greeting based on time of day
   - Subscribe to real-time step updates via Supabase

2. **Pull to Refresh**:
   - Set `isRefreshing = true`
   - Re-fetch all data (steps, weekly, feed)
   - Set `isRefreshing = false`

3. **Tap Main Step Card**:
   - Navigate to Steps History screen

4. **Tap Notification Bell**:
   - Navigate to Notifications screen
   - Show badge with unread count

5. **Tap Settings Icon**:
   - Navigate to Settings screen

6. **Tap Activity Feed Item**:
   - If friend achievement: Navigate to friend's profile
   - If group activity: Navigate to group detail
   - If personal milestone: Show celebration animation

7. **Real-time Updates**:
   - Listen for Supabase real-time events
   - Update step count live as user walks
   - Add new activity items as they occur

## File Structure

```
src/screens/home/
├── HomeScreen.tsx
├── components/
│   ├── StepCounterCard.tsx
│   ├── StatCard.tsx
│   ├── ActivityFeedItem.tsx
│   ├── StreakBadge.tsx
│   └── GreetingHeader.tsx
└── hooks/
    └── useHomeData.ts
```

## Dependencies

- Plan 3: Steps API endpoints
- Plan 4: Friends API for activity feed
- Plan 7: Notifications for bell icon
- Plan 8: User preferences for units and goal
- Plan 9: Frontend setup with Zustand

**New Packages:**
- `react-native-circular-progress` - For circular progress indicator
- `@react-native-community/datetimeformatter` - For time-based greetings

## Acceptance Criteria

- [ ] Home screen displays today's step count
- [ ] Circular progress shows goal completion percentage
- [ ] Distance displayed in user's preferred units (km/miles)
- [ ] Streak counter shows current streak days
- [ ] Weekly stats calculated and displayed
- [ ] Activity feed shows recent events
- [ ] Pull to refresh updates all data
- [ ] Real-time step updates work
- [ ] Greeting changes based on time of day
- [ ] Notification bell shows unread count badge
- [ ] Navigation to all linked screens works
- [ ] Empty state shown if no activity
- [ ] Loading skeleton shown while data loads
- [ ] Error state shown if API fails

## Accessibility

- Step count announced by screen reader
- Progress percentage announced
- Activity feed items have accessible labels
- Notification badge count announced
- All interactive elements have 44x44 touch targets
- High contrast between text and background
- Support for dynamic font sizes

## Testing

**Component Tests:**
- StepCounterCard displays correct count and progress
- StatCards display formatted numbers
- Activity feed renders items correctly
- Greeting changes with time of day

**Integration Tests:**
- Pull to refresh fetches new data
- Navigation from home to other screens works
- Real-time updates are received
- API errors show error state
