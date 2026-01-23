# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2026-01-23

### Added
- Dependency graph visualization with status-colored nodes
- Archive/unarchive beads with "Show Archived" toggle
- Board-level sorting controls (priority, date, title)
- Card animations with in-progress glow effect
- Compact card design (~40% smaller)
- Comments panel in expanded bead modal
- Kebab menu on project tabs
- `--port/-p` CLI flag for server port configuration
- New API endpoints:
  - `GET /api/projects/:id/beads/:beadId` - Single bead fetch
  - `GET /api/projects/:id/beads/:beadId/comments` - Bead comments
  - `GET /api/projects/:id/beads/:beadId/dependencies` - Dependency chain
  - `PATCH /api/projects/:id/beads/:beadId/archive` - Archive/unarchive

### Fixed
- Memory leak in project tab event listeners
- Project removal failing after first deletion
- Dependency display and graph traversal issues

### Changed
- Updated README with new features and screenshots
- Reorganized theme screenshots in documentation

## [1.0.0] - 2026-01-18

### Added
- Initial release of Abacus dashboard
- Kanban board view with four columns (Open, In Progress, Blocked, Closed)
- Multi-project support with sidebar navigation
- Real-time updates via Server-Sent Events (SSE)
- Folder browser for easy project discovery
- Bead detail modal with dependency navigation
- Four themes: Light, Dark, Nord, Warm
- Theme persistence via localStorage
- SQLite database support (beads.db)
- JSONL file support (issues.jsonl)
- Playwright E2E test suite

### Technical
- Web Components architecture with Shadow DOM
- Node.js HTTP server (no frameworks)
- File watching with chokidar
- Smart broadcast deduplication (hash-based)

## [0.1.0] - 2025-01-18

### Added
- Initial public release

[Unreleased]: https://github.com/haal-laah/abacus/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/haal-laah/abacus/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/haal-laah/abacus/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/haal-laah/abacus/releases/tag/v0.1.0
