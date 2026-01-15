# Forbidden Actions

These actions are strictly prohibited for all agents. Violations must trigger an immediate STOP.

## Git Operations

- NEVER merge branches
- NEVER work directly on main branch - always create a feature branch first
- NEVER rebase or rewrite history
- NEVER delete branches
- NEVER use `--force` or `--force-with-lease`
- NEVER amend commits that have been pushed

**Required Branch Workflow**:
- Always check current branch before starting work
- If on main/master, create a feature branch (e.g., `feature/user-authentication`)
- Use descriptive branch names reflecting the feature or plan being implemented

**Allowed Operations**:
- The Implementer and Tester Agents MAY commit changes following the Conventional Commits specification
- Agents MAY push commits to feature branches after committing
- Push commits immediately after creating them for backup and collaboration
- See `.claude/agents/implementer.md` and `.claude/agents/tester.md` for commit guidelines

## Code Modifications

- NEVER change unrelated code "while here"
- NEVER refactor code unless explicitly requested
- NEVER rename public types unless specified in the plan
- NEVER modify architecture policies
- NEVER add, remove, or update NuGet packages without explicit justification and approval
- NEVER introduce new dependencies without documented justification
- NEVER delete existing tests

## Scope Violations

- NEVER invent requirements
- NEVER assume requirements not explicitly stated
- NEVER expand scope beyond the approved plan
- NEVER make "improvements" not requested
- NEVER add features not in the plan
- NEVER change API contracts without explicit instruction

## Safety Violations

- NEVER bypass failing tests
- NEVER disable analyzers or warnings
- NEVER hardcode secrets or credentials
- NEVER ignore security vulnerabilities
- NEVER skip validation

## Process Violations

- NEVER proceed when uncertain - STOP and ask
- NEVER skip the review step
- NEVER override user decisions
- NEVER continue after a BLOCKER is identified

## When in Doubt

If any action feels ambiguous or risky: **STOP and ask for human clarification.**
