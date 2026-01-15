# Plan 13: Steps History UI

## Summary

The Steps History screen provides detailed views of walking activity over time with interactive charts, calendar selection, and filterable lists. Users can view their step history by day, week, or month with visual representations and detailed statistics.

## Screen Purpose

Detailed step tracking history with charts and analytics.

## ASCII Wireframe

```
┌─────────────────────────────────────┐
│  ← Steps History         📅  📤     │
├─────────────────────────────────────┤
│                                     │
│  ┌────────┐ ┌────────┐ ┌────────┐  │
│  │ Daily  │ │ Weekly │ │Monthly │  │
│  └────────┘ └────────┘ └────────┘  │
│     ▔▔▔▔▔▔                         │
│                                     │
│  ┌─────────────────────────────┐   │
│  │         📊 Chart            │   │
│  │                             │   │
│  │   █                         │   │
│  │   █   █                     │   │
│  │   █   █   █       █         │   │
│  │   █   █   █   █   █   █     │   │
│  │─────────────────────────────│   │
│  │ Mon Tue Wed Thu Fri Sat Sun │   │
│  └─────────────────────────────┘   │
│                                     │
│  This Week: Jan 8 - Jan 14          │
│  Total: 64,638 steps                │
│  Average: 9,234 steps/day           │
│  Distance: 51.7 km                  │
│                                     │
│  History                            │
│  ─────────────────────────────      │
│  📅 Monday, Jan 13                  │
│     12,547 steps • 10.0 km          │
│     ━━━━━━━━━━━━━━━━━ 125%         │
│                                     │
│  📅 Sunday, Jan 12                  │
│     8,234 steps • 6.6 km            │
│     ━━━━━━━━━━━ 82%                │
│                                     │
│  📅 Saturday, Jan 11                │
│     15,892 steps • 12.7 km          │
│     ━━━━━━━━━━━━━━━━━━━ 159%       │
│                                     │
└─────────────────────────────────────┘
```

## Components

**React Native Paper:**
- `SegmentedButtons` (Daily/Weekly/Monthly tabs)
- `Card` (chart container, stats summary)
- `List.Item` (daily history entries)
- `ProgressBar` (goal completion per day)
- `IconButton` (calendar, export)

**Chart Library:**
- `react-native-chart-kit` or `victory-native`
  - `BarChart` for daily view
  - `LineChart` for weekly/monthly trends

**Custom:**
- `StepHistoryItem` - Daily entry with progress
- `StatsSum mary` - Aggregated stats display
- `DateRangePicker` - Calendar modal

## API Calls

```typescript
// Daily view
GET /api/steps/daily?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

// Individual day details
GET /api/steps?date=YYYY-MM-DD
```

## State Management

**Local State:**
- `selectedView: 'daily' | 'weekly' | 'monthly'`
- `dateRange: { start: Date, end: Date }`
- `showCalendar: boolean`
- `isLoading: boolean`

**Global State:**
- `stepsStore.dailyHistory`
- `stepsStore.fetchDailyHistory(dateRange)`

## Interactions

1. **Tab Selection**: Switch between Daily/Weekly/Monthly views
2. **Calendar Button**: Open date range picker
3. **Export Button**: Export data as CSV (future)
4. **Pull to Refresh**: Reload data
5. **Tap History Entry**: Show detailed view for that day
6. **Swipe Chart**: Navigate between periods
7. **Chart Bar/Point Tap**: Highlight specific day

## Acceptance Criteria

- [ ] Three tab views (Daily, Weekly, Monthly)
- [ ] Interactive chart displays data
- [ ] Date range selection works
- [ ] Stats summary accurate
- [ ] History list shows all entries
- [ ] Progress bars show goal completion
- [ ] Empty state for no data
- [ ] Loading skeleton while fetching
- [ ] Data persists when switching tabs
