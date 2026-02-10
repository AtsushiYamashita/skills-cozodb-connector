# CozoDB Edge Cases and Known Issues

## Node.js Issues

### 1. Native Module Build Failures

**Symptom**: `npm install cozo-node` fails with compilation errors

**Causes**:

- Missing C++ build tools
- Missing Python (for node-gyp)
- Unsupported Node.js version

**Solutions**:

```powershell
# Windows: Install build tools
npm install --global windows-build-tools

# Or use pre-built binaries (if available)
npm install cozo-node --ignore-scripts
```

### 2. RocksDB Not Available

**Symptom**: `Error: Invalid engine 'rocksdb'`

**Cause**: Pre-built binary doesn't include RocksDB

**Solution**: Use SQLite instead

```javascript
const db = new CozoDb("sqlite", "./data.db");
```

### 3. SQLite Path Issues

**Symptom**: Database file created in wrong location

**Solution**: Always use absolute paths

```javascript
const path = require("path");
const dbPath = path.join(__dirname, "data.db");
const db = new CozoDb("sqlite", dbPath);
```

## Browser WASM Issues

### 1. CDN Import Memory Errors

**Symptom**: `RuntimeError: memory access out of bounds` when using ESM CDN imports

**Cause**: WASM memory management issues with dynamic ESM bundling

**Solution**: Bundle WASM locally instead of CDN

```bash
npm install cozo-lib-wasm
# Use bundler (webpack/vite) to include WASM
```

### 2. Data Loss on Page Reload

**Symptom**: All data gone after refreshing page

**Cause**: Browser WASM is in-memory only

**Solution**: Implement IndexedDB persistence (see `browser-wasm-setup.md`)

### 3. Large Dataset Performance

**Symptom**: UI freezes during large queries

**Cause**: WASM runs on main thread

**Solutions**:

- Use `:limit` to reduce result size
- Move to Web Worker (experimental)
- Paginate queries

## Datalog Query Issues

### 1. Inline Comments Breaking Queries

**Symptom**: Syntax errors with `//` comments in queries

**Cause**: Datalog doesn't support `//` inline comments

**Solution**: Remove inline comments or use `#` at line start

```datalog
# This is a comment
?[a] <- [[1]]  # Don't put comments here
```

### 2. Column Order Performance

**Symptom**: Query is 100x slower than expected

**Cause**: Key column order doesn't match query filter pattern

**Solution**: Reorder key columns to match common query patterns

```datalog
# If you often filter by 'type' first, put it first in the key
:create items {
    type: String,
    id: Int
    =>
    data: String
}
```

### 3. Recursive Query Non-Termination

**Symptom**: Query runs forever

**Cause**: Unbounded recursion without termination condition

**Solution**: Add depth limit

```datalog
path[to, 1] := *edges{from: 1, to}
path[to, n + 1] := path[mid, n], *edges{from: mid, to}, n < 100  # Limit depth
?[node, dist] := path[node, dist]
```

## HNSW Vector Index Issues

### 1. Dimension Mismatch

**Symptom**: `Error: vector dimension mismatch`

**Cause**: Query vector dimension doesn't match index dimension

**Solution**: Ensure all vectors have exactly `dim` dimensions

```datalog
::hnsw create items:vec_idx {
    fields: [embedding],
    dim: 1536,  # Must match your embedding model output
    ...
}
```

### 2. Out of Memory During Index Build

**Symptom**: Process crashes when building large HNSW index

**Solution**:

- Reduce `m` parameter (fewer connections per node)
- Increase system memory
- Build index in batches

## CozoDB-Specific Pitfalls

### 1. `:create` vs `:ensure` — Schema Idempotency

**Symptom**: `:create` throws error on second run

**Cause**: `:create` fails if the relation already exists. This breaks restart/redeploy flows.

**Solution**: Use `:ensure` for idempotent schema setup, or wrap `:create` in try/catch.

```javascript
// BAD: fails on second run
await db.run(`:create users { id: Int => name: String }`);

// GOOD: idempotent — creates only if missing
await db.run(`?[id, name] <- [] :ensure users {id: Int => name: String}`);

// or: wrap in try/catch
try {
  await db.run(`:create users { id: Int => name: String }`);
} catch (e) {
  /* relation exists, safe to ignore */
}
```

### 2. Column Count Mismatch in `:put`

**Symptom**: Cryptic error like `evaluation of query failed`

**Cause**: Number of columns in data (`?[...]`) differs from `:put` field list

```datalog
# BAD: 3 columns in data, but :put expects 4 (id => name, email, age)
?[id, name, email] <- [[1, 'Alice', 'alice@test.com']]
:put users {id => name, email, age}

# GOOD: match all fields exactly
?[id, name, email, age] <- [[1, 'Alice', 'alice@test.com', 30]]
:put users {id => name, email, age}
```

### 3. Null Handling

**Symptom**: `null` values silently accepted but cause unexpected query behavior

**Cause**: CozoDB treats `null` as a valid value distinct from "no value". Nulls are included in aggregations and comparisons may behave unexpectedly.

**Solution**: Use `default` in schema definition. Filter nulls explicitly.

```datalog
# Schema with defaults prevents nulls
:create items { id: Int => status: String default 'active' }

# Explicit null filter in queries
?[name] := *users{name, email}, email != null
```

### 4. Batch Insert Performance

**Symptom**: Inserting 10,000+ rows is slow when done row-by-row

**Cause**: Each `:put` is a separate transaction

**Solution**: Batch rows into a single `:put` query. Aim for 1,000–5,000 rows per batch.

```javascript
// BAD: 10,000 separate queries
for (const row of rows) {
  await db.run(
    `?[id, val] <- [[${row.id}, '${row.val}']] :put items {id => val}`,
  );
}

// GOOD: single query with all rows
const dataJson = JSON.stringify(rows.map((r) => [r.id, r.val]));
await db.run(`?[id, val] <- ${dataJson} :put items {id => val}`);
```

### 5. WASM Is Not Thread-Safe

**Symptom**: Corrupt data or crashes when using CozoDB WASM from Web Workers

**Cause**: The WASM instance is not designed for concurrent access from multiple threads

**Solution**: Use a single WASM instance per context. If using Web Workers, create one worker that owns the DB instance and communicate via `postMessage`.

## General Best Practices

1. **Always handle errors**:

```javascript
const result = await db.run(query);
if (!result.ok) {
  console.error("Query failed:", result.message);
}
```

2. **Use transactions for batch operations**:

```datalog
{
    ?[...] <- [...] :put table1 {...}
    ?[...] <- [...] :put table2 {...}
}
```

3. **Backup before major changes**:

```javascript
await db.backup("./backup-" + Date.now() + ".db");
```

4. **Monitor query performance**:

```datalog
::explain ?[...] := *table{...}
```
