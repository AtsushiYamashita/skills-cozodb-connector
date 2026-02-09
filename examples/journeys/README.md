# User Journey Examples

This directory contains 4 complete user journey examples demonstrating CozoDB integration patterns.

## Prerequisites

Run all Node.js examples from the **project root** directory:

```bash
cd d:\project\skills-cozodb-connector
```

Ensure `cozo-node` is installed:

```bash
npm install cozo-node
```

## Journeys

### Journey 1: Node.js Only (REST API)

**Scenario**: Backend API server with CozoDB as data store

```bash
node examples/journeys/journey1-node-only.js
```

Features:

- Functional wrapper usage
- Repository pattern
- Pure validation functions
- Express.js-style handlers

### Journey 2: PWA Only (Offline Notes App)

**Scenario**: Browser-only notes application

```bash
npx serve examples/journeys -l 3460
# Open http://localhost:3460/journey2-pwa-only.html
```

Features:

- CozoDB WASM in browser
- IndexedDB persistence
- Pure UI rendering functions
- Offline-capable

### Journey 3: Multi-Tenant (User-Specific Databases)

**Scenario**: SaaS application with isolated tenant databases

```bash
node examples/journeys/journey3-multi-tenant.js
```

Features:

- Each tenant gets their own SQLite file
- Complete data isolation
- Dynamic tenant creation
- Tenant cleanup

### Journey 4: PWA + Node.js Hybrid (Sync)

**Scenario**: Offline-first with server sync

```bash
# Terminal 1: Start sync server
node examples/journeys/journey4-sync-server.js

# Terminal 2: Serve PWA client (not included yet)
# The server exposes REST endpoints for sync
```

Features:

- Offline data in browser
- Server-side authoritative storage
- Conflict resolution
- REST sync API

## Code Style

All examples follow these patterns:

- **Pure functions** for business logic
- **Immutable data** with `Object.freeze()`
- **Dependency injection** for testability
- **Side effect isolation** in clearly marked boundaries
