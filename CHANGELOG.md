# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Health check endpoint at `/health` (CC-007)
- Rate limiting middleware with global and auth-specific policies (CC-008)
- Privacy level constants for type-safe privacy settings (DB-005)
- Integration test project with WebApplicationFactory (CC-001)
- Repository unit tests for AuthRepository, ActivityRepository, NotificationRepository, UserPreferencesRepository (CC-002)
- Analytics store frontend tests (CC-002)
- Architecture Decision Records for key project decisions (CC-004)
- Navigation utility functions for cross-tab navigation (FE-009)
- CHANGELOG for tracking project changes (CC-004)

### Changed

- Converted DTOs from classes to C# records for immutability (BE-013)
- Moved FriendshipStatusStrings to Friends feature folder (BE-014)
- Replaced emoji unicode escapes with MaterialCommunityIcons (FE-008)

### Fixed

- Extracted hardcoded date to named constant in step sync logic (BE-009)
- Removed 59 redundant try-catch blocks from controllers, relying on global exception middleware (BE-002)
- Added 8 missing database indexes for foreign keys and frequent query patterns (DB-001)
- Decoupled API client from Zustand store to eliminate circular dependencies (FE-006)
- Eliminated duplicate preferences storage by using user_preferences table as single source of truth (BE-001)
- Moved group join codes to secure separate table with Row-Level Security (DB-002)
- Added React error boundaries for graceful crash recovery (CC-003)
- Extracted AuthRepository from AuthService to follow single-responsibility principle (BE-003, BE-004)
- Fixed all broken backend tests across 869 test cases (Wave 1)
- Fixed all broken frontend tests across 8 test suites (Wave 1)
- Removed dead GetFriendStepsAsync endpoint (BE-010)
