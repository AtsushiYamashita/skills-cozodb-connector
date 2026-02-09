---
name: cozodb-connector
description: |
  CozoDB integration specialist for AI agents. Use when setting up CozoDB 
  database connections in Node.js servers (cozo-node with Memory/SQLite/RocksDB 
  backends) or browser PWAs (cozo-lib-wasm with in-memory storage). Provides 
  Datalog query patterns, installation guidance, storage backend selection, 
  and persistence strategies for both environments.

  Trigger when: user asks about CozoDB installation, Datalog queries, 
  graph database for AI agents, vector search in CozoDB, or connecting 
  to CozoDB from JavaScript/Node.js/browser environments.
---

# CozoDB Connector Skill

CozoDB is a transactional, relational-graph-vector database using Datalog for queries.
It serves as the "hippocampus" (long-term memory) for AI agents, combining structured
data, graph traversal, and vector search in a single embeddable engine.

## Quick Start

### Node.js (Recommended for Persistence)

```javascript
const { CozoDb } = require("cozo-node");

// Memory backend (non-persistent, fastest)
const memDb = new CozoDb();

// SQLite backend (persistent, portable)
const sqliteDb = new CozoDb("sqlite", "./data.db");

// RocksDB backend (persistent, high-performance)
const rocksDb = new CozoDb("rocksdb", "./rocksdb-data");

// Run Datalog query
const result = await db.run(`
    ?[greeting] <- [['Hello CozoDB!']]
`);
console.log(result.rows); // [['Hello CozoDB!']]
```

### Browser WASM

```javascript
// Load from CDN (experimental - may have memory issues)
import init, { CozoDb } from "cozo-lib-wasm";
await init();
const db = CozoDb.new();

// Run query
const result = JSON.parse(db.run("?[a] <- [[1]]"));
```

> **Warning**: Browser WASM uses in-memory storage only. Data is lost on page reload.
> For persistence, use the IndexedDB export/import pattern (see references/browser-wasm-setup.md).

## Storage Backend Selection

| Backend          | Persistence | Best For                   | Install                 |
| ---------------- | ----------- | -------------------------- | ----------------------- |
| **Memory**       | ❌          | Testing, temp calculations | Default                 |
| **SQLite**       | ✅          | Portability, backups, PWA  | Built-in                |
| **RocksDB**      | ✅          | Production servers         | May need Rust toolchain |
| **Browser WASM** | ❌          | Client-side demos          | npm/CDN                 |

Decision guide:

- **Node.js production**: Use SQLite (simpler) or RocksDB (faster writes)
- **Node.js testing**: Use Memory
- **Browser PWA**: Use WASM + IndexedDB export/import PoC
- **Cross-platform backup**: Export to SQLite format

## Datalog Query Patterns

### Schema Definition

```datalog
:create users {
    id: Int
    =>
    name: String,
    email: String,
    age: Int default 0
}
```

Keys before `=>`, values after. Keys form the primary composite key.

### CRUD Operations

```datalog
# Insert (Put)
?[id, name, email, age] <- [[1, 'Alice', 'alice@example.com', 30]]
:put users {id => name, email, age}

# Query
?[name, age] := *users{name, age}

# Query with filter
?[name] := *users{name, age}, age > 25

# Update (same as insert with existing key)
?[id, name, email, age] <- [[1, 'Alice Smith', 'alice@example.com', 31]]
:put users {id => name, email, age}

# Delete
?[id, name, email] <- [[1, 'Alice Smith', 'alice@example.com']]
:rm users {id, name, email}
```

### Joins (Automatic via Shared Variables)

```datalog
# Implicit join: shared variable 'user_id' links relations
?[user_name, order_total] :=
    *users{id: user_id, name: user_name},
    *orders{user_id, total: order_total}
```

### Graph Traversal (Recursive Queries)

```datalog
# Transitive closure: find all reachable nodes
reachable[to] := *follows{from: 1, to}
reachable[to] := reachable[mid], *follows{from: mid, to}
?[name] := reachable[id], *users{id, name}
```

### Vector Search (HNSW)

```datalog
# Create HNSW index
::hnsw create articles:embedding_idx {
    fields: [embedding],
    dim: 1536,
    m: 16,
    ef_construction: 200,
    distance: cosine
}

# Semantic search
?[id, content, score] :=
    ~articles:embedding_idx{id | query: $query_vec, k: 5, distance: score},
    *articles{id, content}
```

### Aggregations

```datalog
?[department, count(name), mean(age)] :=
    *users{name, age, department}
```

### Ordering and Limiting

```datalog
?[name, age] := *users{name, age}
:order -age     # Descending
:limit 10
```

### Parameters

```javascript
await db.run(
  `
    ?[name] := *users{name, department}, department == $dept
`,
  { dept: "Engineering" },
);
```

## System Commands

```datalog
::relations           # List all relations
::columns users       # Show relation schema
::indices users       # Show indices
::explain <query>     # Query execution plan
```

## References

For detailed guidance, see:

- [references/nodejs-setup.md](references/nodejs-setup.md) - Node.js installation and backend configuration
- [references/browser-wasm-setup.md](references/browser-wasm-setup.md) - Browser WASM integration with IndexedDB persistence
- [references/datalog-syntax.md](references/datalog-syntax.md) - Complete Datalog query reference
- [references/storage-engines.md](references/storage-engines.md) - Backend comparison and tuning
- [references/edge-cases.md](references/edge-cases.md) - Known issues and workarounds

## Examples

Working examples are in `examples/`:

- `nodejs-spike/` - Node.js with Memory, SQLite, RocksDB backends
- `browser-spike/` - Browser WASM with IndexedDB persistence PoC
