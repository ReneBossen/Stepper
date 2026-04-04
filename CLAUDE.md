# CLAUDE.md - Project Instructions

## Project Overview

**Stepper** is a mobile fitness application for tracking daily steps, competing with friends, and joining groups.

| Layer | Technology |
|-------|------------|
| Mobile | React Native + Expo (TypeScript) |
| Backend | .NET 10 Web API (C# 13) |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth |
| State | Zustand |

---

## How Work Gets Done

### Work Directly

For small, focused changes (bug fixes, config, docs, single-file refactors, anything touching fewer than ~3 files), work directly without spawning subagents.

### Delegate to Subagents

For multi-file features spanning backend + frontend + database, large refactors, or tasks requiring sustained specialized focus, use Claude Code's native Agent tool to spawn subagents. Subagents automatically inherit project policies from `.claude/policies/`.

### Plan-Driven Features

Features with a plan in `docs/plans/` should follow plan-first workflow: read the plan fully, break it into steps, then execute. Use subagents for parallel independent work.

### Always Ask When in Doubt

If there is ANY uncertainty about requirements, technical approach, security, performance, or architectural decisions: **STOP and ask the user.** One extra question is better than one wrong assumption.

---

## Starting a New Plan

1. **Sync with master:** `git checkout master && git pull`
   - If uncommitted changes exist, ask user how to handle them
2. **Create feature branch:** `git checkout -b feature/{descriptive-name}`
3. **Read the plan thoroughly** from `docs/plans/`
   - Identify ALL requirements and acceptance criteria
   - If anything is unclear, STOP and ask
4. **Break into steps** and execute, using subagents for parallel independent work
5. **Verify each step** compiles and passes tests before proceeding

---

## Governance

All rules, standards, and constraints live in `.claude/policies/`:

| Policy | Covers |
|--------|--------|
| `architecture.md` | Screaming Architecture, vertical slices, Supabase patterns |
| `coding-standards.md` | DRY, SOLID, C#/.NET idioms, testing standards |
| `contract.md` | Non-negotiable principles, quality gates, agent behavior |
| `forbidden.md` | Prohibited actions (git, scope, safety, process) |

These are loaded automatically. Do not duplicate their content here.

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

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `style`

---

## Quality Gates

### Before Completing Any Task

- [ ] All tests pass
- [ ] No build errors
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

1. **Policies in `.claude/policies/` govern all work automatically**
2. **Work directly for small changes, use subagents for larger features**
3. **Always sync with master first**
4. **Read plans completely before starting**
5. **Ask when in doubt - always**
6. **Small commits, clear messages**
7. **Tests must pass**
