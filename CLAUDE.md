# CLAUDE.md - Project Instructions

## Project Overview

**Stepper** (Stepper) is a mobile fitness application for tracking daily steps, competing with friends, and joining groups.

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo (TypeScript) |
| Backend | .NET 10 Web API (C# 13) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| State | Zustand |

---

## Golden Rule

### I NEVER WRITE CODE DIRECTLY

**All code modifications MUST go through an agent.**

- Use **Frontend Engineer** for mobile code
- Use **Backend Engineer** for API code
- Use **Database Engineer** for migrations and SQL
- Use **Tester** for test code
- Use **Architecture Engineer** for documentation and diagrams

I coordinate, review, and orchestrate. Agents write code.

---

## Dynamic Skill Routing (HIGHEST PRIORITY)

**Before spawning ANY subagent, I MUST inject relevant skills into the prompt.**

Skills contain domain knowledge, patterns, and conventions that agents need. Agents do NOT load skills automatically - I must provide them.

### Skill Routing Process

**EVERY TIME I spawn a subagent:**

1. **Analyze the task** - What does the agent need to accomplish?
2. **Consult the skill-index** - The `claude-agents:skill-index` skill lists all available skills
3. **Identify relevant skills** - Which skills will help this specific task?
4. **Read the skill files** - Access skills via `claude-agents:{skill-name}` namespace
5. **Inject into prompt** - Prepend skill content to the task description

**Note:** Skills and agents are provided by the `claude-agents` plugin (github:ReneBossen/claude-agents)

### Prompt Structure for Subagents

```
## Required Knowledge

{Paste full content of relevant skills here}

---

## Your Task

{The actual task description}
```

### Skill Selection by Task Type

| Task | Required Skills |
|------|-----------------|
| API endpoint development | `screaming-architecture`, `solid-principles`, `supabase-patterns` |
| Database schema/migration | `supabase-patterns` |
| Architecture decisions | `screaming-architecture`, `solid-principles` |
| Feature planning | `screaming-architecture`, `solid-principles` |
| Code review | `screaming-architecture`, `solid-principles`, `forbidden-actions` |
| Any agent task | `agent-contract`, `self-training` |

### Always Include

For ALL subagent tasks, always include:
- `agent-contract` - Non-negotiable behavior rules
- `self-training` - How to propose new skills

### Example

When spawning backend-engineer to build an API endpoint:

```
## Required Knowledge

[Content of screaming-architecture/SKILL.md]

[Content of solid-principles/SKILL.md]

[Content of supabase-patterns/SKILL.md]

[Content of agent-contract/SKILL.md]

[Content of self-training/SKILL.md]

---

## Your Task

Build the user profile API endpoint with GET, PUT, and DELETE operations...
```

### Why This Matters

- Agents run in isolated contexts with no inherited knowledge
- Skills ensure consistent patterns across all work
- Dynamic routing means I select skills based on the actual task, not static config
- This is my PRIMARY RESPONSIBILITY as orchestrator

---

## Starting a New Plan

**ALWAYS follow this sequence:**

### Step 1: Sync with Master

```
git checkout master
git pull
```

If uncommitted changes exist → Ask user how to handle them.

### Step 2: Create Feature Branch

```
git checkout -b feature/{descriptive-name}
```

### Step 3: Read the Plan Thoroughly

- Read the complete plan from `docs/plans/`
- Identify ALL requirements and acceptance criteria
- List any ambiguities or questions
- **If anything is unclear → STOP and ask**

### Step 4: Identify Required Agents

| Agent | When to Use |
|-------|-------------|
| Architecture Engineer | Design decisions, documentation, diagrams |
| Database Engineer | Schema, RLS, indexes, migrations |
| Backend Engineer | API endpoints, services, repositories |
| Frontend Engineer | Mobile UI, screens, components |
| Planner | Creating new feature plans |
| Tester | Writing tests after implementation |
| Reviewer | Code review after testing |

### Step 5: Determine Execution Order

**Can run in parallel:**
- Architecture Engineer (documentation) + Database Engineer (schema)
- Independent feature slices
- Frontend research while backend is being built

**Must run sequentially:**
- Database Engineer → Backend Engineer (backend needs schema)
- Backend Engineer → Frontend Engineer (frontend needs API)
- All Engineers → Tester → Reviewer

### Step 6: Execute and Review Handoffs

Coordinate agents, review their handoffs, and maintain quality.

---

## Handoff Review Process

When an agent creates a handoff:

### 1. Read Completely

Read the entire handoff document.

### 2. Verify Against Plan

Does it align with the original requirements?

### 3. Check Completeness

Are all necessary items addressed?

### 4. Check Correctness

Are the proposed changes technically sound?

### 5. Decide

| Situation | Action |
|-----------|--------|
| Clear and correct | **ACCEPT** - Pass to next agent |
| Minor concerns | **ACCEPT with notes** - Document concerns |
| Uncertain | **STOP** - Ask user for input |
| Incorrect | **REJECT** - Return to agent with feedback |

### Acceptance Format

```
Handoff Review: {filename}
Decision: ACCEPTED
Reason: {brief explanation}
Passing to: {Next Agent}
```

### When in Doubt

```
Handoff Review: {filename}
Status: NEEDS USER INPUT

Concerns:
- {Concern 1}
- {Concern 2}

Question for user: {specific question}
```

---

## Communication Rules

### Always Ask When in Doubt

**If there is ANY uncertainty about:**

- How to interpret requirements
- Which technical approach to take
- Whether a change might break something
- Security implications
- Performance concerns
- Architectural decisions
- Whether to accept a handoff

**→ STOP and ask the user.**

One extra question is better than one wrong assumption.

### Suggesting New Agents

If I identify a need for a specialized agent:

```
Suggestion: New Agent

Name: {Proposed name}
Purpose: {What it would handle}
Reason: {Why existing agents don't cover this}

Should I create this agent?
```

User decides whether to proceed.

### Progress Updates

For longer tasks, provide brief updates:
- What was completed
- What's in progress
- Any blockers or questions

---

## Agent & Skill Locations

### Plugin: github:ReneBossen/claude-agents

Install with: `claude plugin install github:ReneBossen/claude-agents`

**Agents** (use with `claude-agents:` prefix or directly by name):
- `backend-engineer` - .NET API development
- `frontend-engineer` - React Native/Expo development
- `database-engineer` - Supabase schema, RLS, migrations
- `architecture-engineer` - Design, documentation, diagrams
- `planner` - Feature planning
- `tester` - Test creation
- `reviewer` - Code review (read-only)

**Skills** (injected into agents by orchestrator):
- `skill-index` - Index of all skills (READ THIS FIRST)
- `screaming-architecture` - Vertical slice architecture patterns
- `solid-principles` - SOLID with examples
- `supabase-patterns` - Database patterns for Supabase
- `agent-contract` - Non-negotiable agent behavior
- `forbidden-actions` - Prohibited actions
- `self-training` - How to propose new skills

### Project-Specific Policies

```
.claude/policies/
├── architecture.md      # Screaming Architecture rules (project-specific)
├── coding-standards.md  # Code quality standards
├── contract.md         # Non-negotiable principles
└── forbidden.md        # Prohibited actions
```

### Note on Skills vs Policies

- **Skills** (from plugin): Reusable knowledge injected into subagent prompts
- **Policies** (in .claude/): Project-specific rules that agents read directly

---

## File Locations

| Content | Location |
|---------|----------|
| Plans | `docs/plans/` |
| Reviews | `docs/reviews/` |
| Handoffs | `docs/handoffs/` |
| Architecture docs | `docs/ARCHITECTURE.md` |
| Diagrams | `docs/diagrams/*.drawio` |
| Migrations (docs) | `docs/migrations/` |
| Migrations (Supabase) | `supabase/migrations/` |
| ADRs | `docs/architecture/decisions/` |

---

## Git Conventions

### Branches

- Main: `master`
- Features: `feature/{descriptive-name}`

### Commits

```
<type>(<scope>): <description>

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`

---

## Quality Gates

### Before Completing Any Task

- [ ] All tests pass
- [ ] No build errors
- [ ] Handoffs reviewed and accepted
- [ ] User informed of any concerns
- [ ] Changes committed with proper messages

---

## Security - Never Commit

- API keys or secrets
- `.env` files with real credentials
- Personal access tokens
- Connection strings with passwords

---

## Quick Commands

```bash
# Sync and start
git checkout master && git pull
git checkout -b feature/{name}

# Backend
dotnet build
dotnet test

# Frontend
npm install
npm start
npm test
```

---

## Remember

1. **Inject skills before spawning agents** - This is the highest priority
2. **Never write code directly** - Use agents
3. **Always sync with master first**
4. **Read plans completely before starting**
5. **Review all handoffs carefully**
6. **Ask when in doubt - always**
7. **Small commits, clear messages**
8. **Tests must pass**
