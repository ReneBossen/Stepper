# Architecture: Stepper

## Architectural Pattern: Screaming Architecture

This project follows **Screaming Architecture** principles where the folder structure immediately reveals the business domain and purpose of the application.

### Core Principle

> "Your architecture should scream the intent of the system, not the frameworks you used."
> — Robert C. Martin

When you look at the project structure, you should immediately see:
- This is a **Stepper**
- It tracks **Steps**
- It manages **Users**, **Friends**, and **Groups**

You should NOT see generic technical folders like "Controllers", "Services", "Repositories" at the top level.

## Solution Structure

```
Stepper.Api/
├── Users/                      # User management & profiles
│   ├── UsersController.cs      # HTTP endpoints
│   ├── UserService.cs          # Business logic
│   ├── UserRepository.cs       # Data access via Supabase
│   ├── User.cs                 # Domain model
│   └── DTOs/                   # Request/Response models
│       └── UserProfileResponse.cs
│
├── Steps/                      # Activity tracking
│   ├── StepsController.cs
│   ├── StepService.cs
│   ├── StepRepository.cs
│   ├── StepEntry.cs            # Domain model
│   └── DTOs/
│       ├── RecordStepsRequest.cs
│       └── DailyStepsResponse.cs
│
├── Friends/                    # Social connections
│   ├── FriendsController.cs
│   ├── FriendService.cs
│   ├── FriendRepository.cs
│   ├── Friendship.cs           # Domain model
│   └── DTOs/
│       ├── AddFriendRequest.cs
│       └── FriendListResponse.cs
│
├── Groups/                     # Group competitions
│   ├── GroupsController.cs
│   ├── GroupService.cs
│   ├── GroupRepository.cs
│   ├── Group.cs                # Domain model
│   ├── GroupMembership.cs      # Domain model
│   └── DTOs/
│       ├── CreateGroupRequest.cs
│       └── LeaderboardResponse.cs
│
├── Common/                     # Shared infrastructure
│   ├── Database/
│   │   └── SupabaseClient.cs  # Supabase connection
│   ├── Authentication/
│   │   └── SupabaseAuthExtensions.cs
│   ├── Middleware/
│   │   ├── ExceptionHandlingMiddleware.cs
│   │   └── ValidationMiddleware.cs
│   └── Extensions/
│       └── ServiceCollectionExtensions.cs
│
└── Program.cs                  # Application entry point

tests/
├── Stepper.Api.Tests/       # Integration tests
│   ├── Users/
│   ├── Steps/
│   ├── Friends/
│   └── Groups/
│
└── Stepper.UnitTests/       # Unit tests
    ├── Users/
    ├── Steps/
    ├── Friends/
    └── Groups/
```

## Vertical Slice Architecture

Each feature folder (Users, Steps, Friends, Groups) is a **vertical slice** containing everything needed for that feature:

1. **Controller**: HTTP API endpoints (thin layer)
2. **Service**: Business logic and orchestration
3. **Repository**: Data access via Supabase client
4. **Domain Models**: Entities and value objects
5. **DTOs**: Data transfer objects for API contracts

### Benefits

- **Feature cohesion**: Everything related to a feature is in one place
- **Easy navigation**: Developers can find code by business concept
- **Clear boundaries**: Each slice is independent and focused
- **Minimal coupling**: Features interact through well-defined interfaces
- **Easier onboarding**: New developers immediately understand what the system does

## Core Features

### 1. Users
- User profile management (auth handled by Supabase)
- Profile updates
- User preferences

### 2. Steps
- Record daily step counts and distances
- Retrieve historical activity data
- Sync from mobile device health APIs

### 3. Friends
- Send/accept friend requests
- View friend lists
- Compare activity with friends

### 4. Groups
- Create and join groups
- Group leaderboards
- Competition periods

## Technology Stack

### Backend
- **.NET 10**: Web API
- **C# 13**: Latest language features
- **Supabase**: Authentication, database, real-time, row-level security
- **Supabase.Client**: Official .NET SDK

### Frontend
- **Expo**: React Native framework
- **React Native**: Mobile UI
- **TypeScript**: Type-safe JavaScript
- **Supabase JS**: Client library for auth and data

### Testing
- **xUnit**: Test framework
- **NetArchTest**: Architecture rule enforcement

## Supabase Integration

### Authentication
- **Handled by Supabase** - No custom JWT implementation needed
- Users authenticate via Supabase Auth (email/password, OAuth providers)
- Mobile app uses `@supabase/supabase-js` for authentication
- Backend validates Supabase JWT tokens via middleware

### Database
- **PostgreSQL via Supabase**
- Tables:
  - `users` - User profiles (linked to Supabase auth.users)
  - `step_entries` - Daily step and distance records
  - `friendships` - Friend connections
  - `groups` - Group information
  - `group_memberships` - User-group relationships

### Row-Level Security (RLS)
- **Database-level authorization** using PostgreSQL RLS policies
- Users can only access their own data and their friends' data
- No application-level authorization logic needed
- RLS policies defined in Supabase dashboard or migrations

Example RLS policies:
```sql
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can only insert their own steps
CREATE POLICY "Users can insert own steps"
  ON step_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view friends' steps
CREATE POLICY "Users can view friends steps"
  ON step_entries FOR SELECT
  USING (
    user_id = auth.uid() OR
    user_id IN (
      SELECT friend_id FROM friendships
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );
```

### Real-Time Features
- Supabase provides real-time subscriptions out of the box
- Mobile app can subscribe to changes in:
  - Friend requests
  - Group leaderboards
  - New step entries from friends

## Dependency Rules

### Within a Feature Slice
```
Controller → Service → Repository → Supabase Client → Supabase API
         ↓
       DTOs
```

### Cross-Feature Dependencies
- Features should be **loosely coupled**
- If Feature A needs data from Feature B:
  - Option 1: Service-to-Service communication (via interface)
  - Option 2: Direct Supabase queries (read-only)
  - Option 3: Supabase real-time events

### Common Dependencies
- All features can depend on `/Common`
- `/Common` should NOT depend on any feature
- Shared infrastructure (Supabase client, middleware) goes in `/Common`

## API Design

### RESTful Conventions
- `GET /api/steps` - Get all step entries for authenticated user
- `GET /api/steps/{id}` - Get specific step entry
- `POST /api/steps` - Record new steps
- `PUT /api/steps/{id}` - Update step entry
- `DELETE /api/steps/{id}` - Delete step entry

### Authentication
- JWT tokens from Supabase in `Authorization: Bearer {token}` header
- Backend validates token using Supabase JWT verification
- User identity extracted from token claims

### Response Format
```json
{
  "success": true,
  "data": { ... },
  "errors": []
}
```

## Security Model

### Authentication Flow
1. Mobile app authenticates user via Supabase Auth
2. Supabase returns JWT access token
3. Mobile app includes token in API requests to .NET backend
4. Backend validates token with Supabase
5. Backend extracts user ID from validated token

### Authorization
- **Primary**: Row-Level Security (RLS) in Supabase PostgreSQL
- **Secondary**: Application-level checks in services (if needed)
- RLS policies enforce:
  - Users can only access their own data
  - Users can view friends' public data
  - Group members can view group data

### Data Access Pattern
```
Mobile App → .NET API → Supabase Client → PostgreSQL (with RLS)
    ↓
Supabase Auth Token
```

## Quality Standards

- **No business logic in controllers** - Controllers are thin HTTP adapters
- **Services contain business logic** - All validation, rules, and orchestration
- **Repositories use Supabase client** - Data access via Supabase SDK
- **DTOs for API contracts** - Domain models are internal
- **Explicit dependencies** - Constructor injection only
- **Testable code** - All logic can be tested in isolation
- **RLS for data security** - Database enforces access control

## Repository Pattern: Entity Separation

### Domain Models vs. Database Entities

To maintain clean separation between domain logic and database infrastructure, repositories follow this pattern:

**Domain Models** (e.g., `Group.cs`, `GroupMembership.cs`):
- Live in the feature folder
- Represent business concepts
- Free from infrastructure concerns (no Supabase attributes)
- Used by services and controllers
- Immutable where practical

**Entity Classes** (e.g., `GroupEntity.cs`, `GroupMembershipEntity.cs`):
- Live in the feature folder alongside domain models
- Contain Supabase table mapping attributes (`[Table]`, `[Column]`, `[PrimaryKey]`)
- Handle database serialization/deserialization
- Internal to the repository layer
- Include mapping methods to/from domain models

### Example Implementation

```csharp
// Domain model - clean business concept
public class Group
{
    public Guid Id { get; set; }
    public string Name { get; set; }
    public bool IsPublic { get; set; }
    public int MemberCount { get; set; }  // Calculated, not stored
}

// Database entity - infrastructure concern
[Table("groups")]
internal class GroupEntity : BaseModel
{
    [PrimaryKey("id")]
    public Guid Id { get; set; }

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("is_public")]
    public bool IsPublic { get; set; }

    // Mapping methods
    public Group ToGroup(int memberCount) => new()
    {
        Id = Id,
        Name = Name,
        IsPublic = IsPublic,
        MemberCount = memberCount
    };

    public static GroupEntity FromGroup(Group group) => new()
    {
        Id = group.Id,
        Name = group.Name,
        IsPublic = group.IsPublic
    };
}
```

### Benefits

1. **Clean Domain Models**: Business logic isn't polluted with database attributes
2. **Flexibility**: Can change ORM/database without touching domain layer
3. **Calculated Fields**: Domain models can include computed properties (like `MemberCount`) that aren't stored in the database
4. **Testability**: Domain models are POCOs, easy to construct in tests
5. **Clear Boundaries**: Repository is the only layer that knows about entities

### When to Use This Pattern

- **Always** for features with complex domain models
- When domain models include calculated/derived properties
- When domain models differ structurally from database tables
- For features that may need to support multiple data sources

### File Organization

Both domain models and entities live in the same feature folder, maintaining vertical slice cohesion:

```
Groups/
├── Group.cs              # Domain model (public)
├── GroupEntity.cs        # Database entity (internal)
├── GroupMembership.cs    # Domain model (public)
├── GroupMembershipEntity.cs  # Database entity (internal)
├── GroupRepository.cs    # Uses entities internally
└── GroupService.cs       # Uses domain models only
```

## Adding New Features

When adding a new feature:

1. Create a new folder at the root level: `Stepper.Api/{FeatureName}/`
2. Add the vertical slice components:
   - Controller (HTTP endpoints)
   - Service (business logic)
   - Repository (Supabase data access)
   - Domain models
   - DTOs
3. Register services in `Program.cs`
4. Add database tables in Supabase
5. Define RLS policies for the new tables
6. Add tests in corresponding test folders

## Environment Configuration

Required environment variables:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret
```

## Evolution

As the application grows:

- Keep feature slices independent
- Extract truly shared logic to `/Common`
- Consider splitting large features into sub-features
- Use Supabase real-time for cross-feature communication
- Document architectural decisions in this file
- Leverage RLS for complex authorization scenarios

## Why Supabase?

- **Reduced complexity**: No custom auth implementation needed
- **Built-in security**: RLS policies at database level
- **Real-time capabilities**: WebSocket subscriptions out of the box
- **Scalability**: Managed PostgreSQL with connection pooling
- **Developer experience**: Excellent tooling and documentation
- **Cost-effective**: Generous free tier, scales with usage

## References

- [Screaming Architecture (Clean Coder Blog)](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)
- [Vertical Slice Architecture](https://www.jimmybogard.com/vertical-slice-architecture/)
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
