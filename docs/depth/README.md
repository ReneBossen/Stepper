# Technical Debt Documentation

**Date**: 2026-02-02
**Author**: Architecture Engineer Agent

---

## Overview

This document provides a comprehensive index of technical debt identified in the Stepper codebase. Technical debt items are organized by priority and area.

---

## Summary Statistics

| Area | Critical | High | Medium | Low | Total |
|------|----------|------|--------|-----|-------|
| Backend | 1 | 4 | 7 | 3 | 15 |
| Frontend | 0 | 2 | 5 | 4 | 11 |
| Database | 0 | 2 | 2 | 1 | 5 |
| Cross-cutting | 1 | 2 | 3 | 2 | 8 |
| **Total** | **2** | **10** | **17** | **10** | **39** |

---

## Priority Definitions

| Priority | Definition | Action Timeline |
|----------|------------|-----------------|
| **Critical** | Security risk, data integrity issue, or blocks development | Immediate (this sprint) |
| **High** | Significant maintainability or performance impact | Next 2-4 sprints |
| **Medium** | Code quality issue affecting development velocity | Backlog - address when working in area |
| **Low** | Minor improvements, nice-to-have optimizations | Future consideration |

---

## Critical Items (2)

These require immediate attention:

1. **[BE-001] Duplicate Preferences Storage** - Two sources of truth for user preferences (Critical)
2. **[CC-001] Missing Integration Tests** - No integration test coverage (Critical)

---

## High Priority Items (10)

### Backend
- [BE-002] Redundant Exception Handling in Controllers
- [BE-003] AuthService Creates New Supabase Clients Per Request
- [BE-004] Missing Repository for Auth Feature
- [BE-005] Inconsistent String Constants Usage

### Frontend
- [FE-001] TODO Comments for Unimplemented Features
- [FE-002] Hard-coded Start Date in History Query

### Database
- [DB-001] Missing Indexes on Frequently Queried Columns
- [DB-002] RLS Policy Security at API Layer for Join Codes

### Cross-cutting
- [CC-002] Test Coverage Gap Between Backend and Frontend
- [CC-003] Missing Error Boundary Implementation

---

## Documents

| Document | Description |
|----------|-------------|
| [Backend Debt](backend-debt.md) | All backend technical debt items |
| [Frontend Debt](frontend-debt.md) | All frontend technical debt items |
| [Database Debt](database-debt.md) | All database technical debt items |
| [Cross-cutting Debt](cross-cutting-debt.md) | Issues spanning multiple areas |

---

## How to Use This Documentation

1. **When planning sprints**: Review Critical and High priority items
2. **When working in an area**: Check the relevant document for Medium/Low items in that area
3. **Before major refactors**: Use these documents to identify cleanup opportunities
4. **For new team members**: Review to understand known issues and their context

---

## Related Documents

- [Architecture Overview](../ARCHITECTURE.md)
- [Backend Cleanup Report](../cleanup/backend_cleanup_report.md)
- [Mobile Cleanup Report](../cleanup/mobile_cleanup_report.md)
- [Database Cleanup Report](../cleanup/database_cleanup_report.md)
