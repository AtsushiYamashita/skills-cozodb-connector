# CozoDB Connector Skill

AI Agent Skill for CozoDB integration - enabling seamless database connections in Node.js and Browser PWA environments.

[日本語ドキュメント](README.ja.md)

## Overview

CozoDB is an embedded Datalog database with graph query capabilities. This skill provides:

- **Node.js integration** via `cozo-node` (Memory/SQLite/RocksDB backends)
- **Browser PWA integration** via `cozo-lib-wasm` (WebAssembly)
- **Functional patterns** with pure functions and dependency injection
- **Multi-tenant support** with user-specific database instances
- **i18n-ready error handling** with structured error codes

## Scope

### ✅ Can Do

- Embedded database for small-to-medium apps (single process)
- Graph queries and recursive Datalog operations
- Offline-first PWA with local data storage
- Multi-tenant isolation (separate DB per user)
- Full-text search and HNSW vector indexes

### ❌ Cannot Do

- Distributed transactions across multiple servers
- Real-time sync between clients (requires custom implementation)
- Direct SQL queries (Datalog only)
- Browser data larger than available memory (WASM limitation)

### ⚠️ Not Suitable For

- High-concurrency write-heavy workloads (use PostgreSQL/MySQL)
- Data larger than a few GB (use dedicated database servers)
- Applications requiring ACID across network boundaries
- Teams unfamiliar with Datalog who need quick adoption

## Quick Start

### Node.js

```bash
npm install cozo-node
```

```javascript
const { CozoDb } = require("cozo-node");

// In-memory (default)
const db = new CozoDb();

// SQLite (persistent)
const db = new CozoDb("sqlite", "./data.db");

// Query
const result = await db.run(`?[x, y] <- [[1, 'hello'], [2, 'world']]`);
console.log(result.rows); // [[1, 'hello'], [2, 'world']]
```

### Browser (PWA)

```javascript
import init, { CozoDb } from "cozo-lib-wasm";

await init();
const db = CozoDb.new();

// IMPORTANT: Second parameter required for WASM
const result = db.run(`?[x] <- [[1], [2], [3]]`, "{}");
console.log(JSON.parse(result));
```

## Documentation

| File                                                                 | Description                           |
| -------------------------------------------------------------------- | ------------------------------------- |
| [SKILL.md](SKILL.md)                                                 | Main skill instructions for AI agents |
| [references/nodejs-setup.md](references/nodejs-setup.md)             | Node.js installation & configuration  |
| [references/browser-wasm-setup.md](references/browser-wasm-setup.md) | Browser WASM setup                    |
| [references/datalog-syntax.md](references/datalog-syntax.md)         | Datalog query reference               |
| [references/storage-engines.md](references/storage-engines.md)       | Backend comparison guide              |
| [references/edge-cases.md](references/edge-cases.md)                 | Known issues & workarounds            |

## Examples

### Test Runners

```bash
# Node.js (Memory backend)
node examples/nodejs-spike/test-runner.js --backend=memory

# Node.js (SQLite backend)
node examples/nodejs-spike/test-runner.js --backend=sqlite

# Browser PWA
npx serve examples/browser-spike -l 3457
# Open http://localhost:3457/test-runner.html
```

### User Journey Examples

| Journey         | Command                                           | Description        |
| --------------- | ------------------------------------------------- | ------------------ |
| 1. Node.js only | `node examples/journeys/journey1-node-only.js`    | REST API pattern   |
| 2. PWA only     | Serve `journey2-pwa-only.html`                    | Offline notes app  |
| 3. Multi-tenant | `node examples/journeys/journey3-multi-tenant.js` | Per-user databases |
| 4. Hybrid sync  | `node examples/journeys/journey4-sync-server.js`  | PWA + Node sync    |

## Scripts

| Script                    | Purpose                                   |
| ------------------------- | ----------------------------------------- |
| `scripts/cozo-errors.js`  | i18n error codes + security validation    |
| `scripts/cozo-wrapper.js` | Functional wrapper + multi-tenant manager |

## Security

See [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) for:

- Query injection prevention (use parameterized queries)
- Prototype pollution protection
- DoS mitigation (query length limits)

## License

MIT
