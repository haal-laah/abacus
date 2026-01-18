# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/haal-laah/abacus/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/haal-laah/abacus/releases/tag/v0.1.0
