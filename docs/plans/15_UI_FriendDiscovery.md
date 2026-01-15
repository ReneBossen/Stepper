# Plan 15: Friend Discovery UI

## Summary

Friend Discovery screens enable users to find and connect with other users through username search, QR code scanning, and invite link sharing. Multiple discovery methods provide flexibility for adding friends.

## Screens

1. **Discovery Home** - Search, QR scanner, My QR Code, Invite Link
2. **QR Scanner** - Camera view to scan friend's QR code
3. **My QR Code** - Display user's QR code for others
4. **User Search Results** - List of matching users
5. **User Preview** - Quick profile view with Add Friend button

## ASCII Wireframe - Discovery Home

```
┌─────────────────────────────────────┐
│  ← Discover Friends                 │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔍 Search by username...    │   │
│  └─────────────────────────────┘   │
│                                     │
│  Quick Actions                      │
│  ─────────────────────────────      │
│  ┌───────────────────────────────┐ │
│  │  📷  Scan QR Code           │ │
│  │  Scan a friend's code       │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  📱  My QR Code             │ │
│  │  Show your code to friends  │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  🔗  Share Invite Link      │ │
│  │  Send a link via message    │ │
│  └───────────────────────────────┘ │
│                                     │
│  Pending Requests (2)               │
│  ─────────────────────────────      │
│  👤 Tom Wilson (Sent 2 days ago)    │
│  👤 Lisa Brown (Sent 1 week ago)    │
│                                     │
└─────────────────────────────────────┘
```

## QR Scanner Screen

```
┌─────────────────────────────────────┐
│  ✕                   💡 Flash       │
│                                     │
│         ╔══════════════╗            │
│         ║              ║            │
│         ║              ║            │
│         ║    Camera    ║            │
│         ║     View     ║            │
│         ║              ║            │
│         ║              ║            │
│         ╚══════════════╝            │
│                                     │
│    Point camera at friend's code    │
│                                     │
└─────────────────────────────────────┘
```

## My QR Code Modal

```
┌─────────────────────────────────────┐
│  ✕ My QR Code                       │
├─────────────────────────────────────┤
│                                     │
│       ┌─────────────────┐           │
│       │                 │           │
│       │   ████ ██ ████  │           │
│       │   ██ ████ ██ ██ │           │
│       │   ████ ██ ████  │           │
│       │                 │           │
│       └─────────────────┘           │
│                                     │
│        @john_doe                    │
│                                     │
│   Share this code with friends      │
│   to connect instantly              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Save to Photos         │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Share Code             │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

## Components

- `SearchBar` (username search)
- `Camera` from expo-camera (QR scanner)
- `QRCode` generator component
- `List.Item` (search results, pending requests)
- `Button` (action buttons)
- `Modal` (My QR Code display)
- `Share` from expo-sharing

## API Calls

```typescript
GET /api/friends/discovery/search?query={username}
GET /api/friends/discovery/qr-code // Get my QR
GET /api/friends/discovery/qr-code/{qrId} // Lookup user by QR
POST /api/friends/discovery/invite-links // Generate invite link
POST /api/friends/discovery/redeem // Redeem QR or invite code
POST /api/friends/requests // Send friend request
```

## Interactions

1. **Search Input**: Filter users by username, show results
2. **Tap Scan QR**: Open camera with QR scanner
3. **Scan QR Code**: Decode, fetch user, show preview with Add Friend
4. **Tap My QR Code**: Show modal with user's QR code
5. **Save QR to Photos**: Use expo-media-library
6. **Share QR Code**: Use expo-sharing to share image
7. **Tap Share Invite Link**: Generate link, open share sheet
8. **Tap Search Result**: Show user preview with Add Friend button
9. **Tap Add Friend**: Send friend request, show confirmation

## Acceptance Criteria

- [ ] Search finds users by username
- [ ] Search respects privacy settings
- [ ] QR scanner decodes QR codes
- [ ] My QR code displays user's unique code
- [ ] QR code can be saved to photos
- [ ] Invite links can be generated and shared
- [ ] Friend requests sent from discovery
- [ ] Pending outgoing requests shown
- [ ] Cannot send duplicate requests
- [ ] Cannot add self as friend
