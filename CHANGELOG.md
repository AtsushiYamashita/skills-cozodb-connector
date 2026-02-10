# Changelog

All notable changes to this project will be documented in this file.
See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## 1.0.0 (2026-02-11)

### Features

- **cozo-wrapper**: Functional query builders (`buildCreateQuery`, `buildPutQuery`, `buildSelectQuery`, `buildDeleteQuery`)
- **cozo-wrapper**: Database executor with dependency injection (`createExecutor`)
- **cozo-wrapper**: Multi-tenant database manager (`createTenantManager`)
- **cozo-wrapper**: Repository pattern for CRUD operations (`createRepository`)
- **cozo-errors**: Structured error handling with i18n-ready error codes (`CozoError`, `ErrorCodes`)
- **cozo-errors**: Security validator for query inputs (`SecurityValidator`)
- **memory-monitor**: WASM memory tracking with configurable thresholds (`createMemoryMonitor`)
- **sync-helper**: Bidirectional sync between local CozoDB and remote server (`createSyncManager`)

### Documentation

- SKILL.md entry point (141 lines) with quick start and Datalog patterns
- Reference docs: Datalog syntax, Node.js setup, browser WASM, storage engines
- Edge cases documentation with 5 concrete CozoDB pitfalls
- Lessons learned with 6 real-world failure analyses
- Security review document

### Tests

- 102 unit tests covering all public APIs, error handling, memory thresholds, and sync logic
- ~90% line coverage using built-in `node:test` runner
