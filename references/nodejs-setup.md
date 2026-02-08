# Node.js CozoDB Setup

## Installation

```bash
npm install cozo-node
```

The package includes pre-built binaries for most platforms. If building from source is required:

- Windows: Visual Studio Build Tools + Python
- macOS: Xcode Command Line Tools
- Linux: build-essential package

## Storage Backend Configuration

### Memory (Default)

```javascript
const { CozoDb } = require("cozo-node");
const db = new CozoDb(); // In-memory, non-persistent
```

**Use when**: Testing, temporary calculations, development

### SQLite

```javascript
const db = new CozoDb("sqlite", "./path/to/database.db");
```

**Use when**:

- Need portable single-file database
- Backup/restore across different backends
- Moderate write throughput

**File created**: Single `.db` file

### RocksDB

```javascript
const db = new CozoDb("rocksdb", "./path/to/rocksdb-dir");
```

**Use when**:

- High-throughput production workloads
- Need LSM-tree optimizations
- Large datasets with many writes

**Files created**: Directory with multiple files (SST files, WAL, MANIFEST, etc.)

**Tuning**: Set environment variables before creating DB:

```javascript
process.env.COZO_ROCKSDB_WRITE_BUFFER_SIZE = "134217728"; // 128MB
```

## API Reference

### Constructor

```javascript
new CozoDb(engine?: string, path?: string)
```

- `engine`: `'mem'` | `'sqlite'` | `'rocksdb'` (default: `'mem'`)
- `path`: File/directory path for persistent engines

### Methods

```javascript
// Run Datalog query
const result = await db.run(query: string, params?: object): Promise<QueryResult>

// Query result structure
{
    ok: true,
    headers: ['col1', 'col2'],
    rows: [['val1', 'val2'], ...]
}

// Error result
{
    ok: false,
    message: 'Error description'
}
```

### Parameters

```javascript
await db.run(
  `
    ?[name] := *users{name, age}, age > $min_age
`,
  { min_age: 25 },
);
```

## Error Handling

```javascript
try {
  const result = await db.run(query);
  if (!result.ok) {
    console.error("Query error:", result.message);
  }
} catch (error) {
  // Native module errors
  console.error("Runtime error:", error.message);
}
```

## Common Issues

### Build Failures

If npm install fails with native module errors:

1. **Windows**: Install Visual Studio Build Tools

   ```powershell
   npm install --global windows-build-tools
   ```

2. **RocksDB unavailable**: Use SQLite instead
   ```javascript
   const db = new CozoDb("sqlite", "./data.db");
   ```

### Memory Limits

For large datasets, increase Node.js heap:

```bash
node --max-old-space-size=4096 app.js
```
