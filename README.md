# CozoDB Connector Skill

AI Agent Skill for CozoDB integration - Datalog database with graph query capabilities.

[日本語](README.ja.md) | [Setup Guide](docs/SETUP.md)

## Quick Start

```bash
# 1. Install Skill
cd ~/.gemini/antigravity/skills
git clone https://github.com/AtsushiYamashita/skills-cozodb-connector.git cozodb

# 2. Install MCP Server
git clone https://github.com/AtsushiYamashita/mcp-cozodb.git
cd mcp-cozodb && npm install && npm run build

# 3. Configure agent (see docs/SETUP.md)
```

## Development Setup

```bash
# Clone and setup development environment
git clone https://github.com/AtsushiYamashita/skills-cozodb-connector.git
cd skills-cozodb-connector
npm run setup  # Installs deps, runs lint and tests
```

## What This Provides

| Component                      | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| **Skill** (`SKILL.md`)         | Datalog syntax, patterns, best practices   |
| **MCP Server** (`mcp-cozodb/`) | 7 database tools (query, CRUD, schema)     |
| **Scripts**                    | Memory monitor, sync helper, error handler |

## Scope

### ✅ Can Do

- Embedded DB for small-to-medium apps
- Graph queries, recursive Datalog
- Offline-first PWA, multi-tenant isolation
- Full-text search, vector indexes

### ⚠️ Limitations

- **WASM data is volatile** - use `sync-helper.js`
- Datalog only (no SQL)
- Single-process only

### ❌ Not For

- High-concurrency writes → use PostgreSQL
- Large data (>GB) → use dedicated DB

## Code Examples

### Node.js

```javascript
const { CozoDb } = require("cozo-node");
const db = new CozoDb("sqlite", "./data.db");
const result = await db.run(`?[x, y] <- [[1, 'hello'], [2, 'world']]`);
```

### Browser (WASM)

```javascript
import init, { CozoDb } from "cozo-lib-wasm";
await init();
const db = CozoDb.new();
db.run(`?[x] <- [[1], [2]]`, "{}"); // Note: 2nd param required
```

## Documentation

| Doc                                                | Description                     |
| -------------------------------------------------- | ------------------------------- |
| [SKILL.md](SKILL.md)                               | Entry point for AI agents       |
| [docs/SETUP.md](docs/SETUP.md)                     | Complete installation guide     |
| [references/](references/)                         | Datalog syntax, storage engines |
| [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md) | Security guidelines             |

## Scripts

| Script                      | Purpose                           |
| --------------------------- | --------------------------------- |
| `scripts/cozo-wrapper.js`   | Functional wrapper + multi-tenant |
| `scripts/memory-monitor.js` | WASM memory tracking              |
| `scripts/sync-helper.js`    | Bidirectional sync                |

## Versioning

This project follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible functionality additions
- **PATCH** version for backward-compatible bug fixes

For breaking changes, see [docs/MIGRATION.md](docs/MIGRATION.md).

## Performance

Wrapper overhead benchmark (Node.js 24):

- **Executor**: ~2-3ms per query (includes mock latency)
- **Memory monitor**: <1ms overhead
- **Overall impact**: Minimal

Run benchmarks: `node scripts/benchmark.js`

For full CozoDB performance data, see [CozoDB benchmarks](https://github.com/cozodb/cozo#performance).

## Support

See [SUPPORT.md](SUPPORT.md) for how to get help.

## License

MIT
