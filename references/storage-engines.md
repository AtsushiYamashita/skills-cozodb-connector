# CozoDB Storage Engines

## Comparison Matrix

| Feature     | Memory  | SQLite   | RocksDB        | TiKV        |
| ----------- | ------- | -------- | -------------- | ----------- |
| Persistence | ❌      | ✅       | ✅             | ✅          |
| Time Travel | ✅      | ✅       | ✅             | ❌          |
| Concurrency | Single  | Limited  | High           | Very High   |
| Setup       | None    | None     | May need build | Cluster     |
| Use Case    | Testing | Portable | Production     | Distributed |

## Memory Backend

**Code**: `new CozoDb()` or `new CozoDb('mem')`

### Characteristics

- Data stored in RAM only
- Fastest read/write performance
- Data lost when process exits
- No disk I/O overhead

### Best For

- Unit tests
- Temporary calculations
- Development/prototyping
- Stateless microservices

## SQLite Backend

**Code**: `new CozoDb('sqlite', './path/to/file.db')`

### Characteristics

- Single-file database
- Good for moderate workloads
- Cross-platform portable
- Built-in (no additional dependencies)

### Best For

- Embedded applications
- Mobile/desktop apps
- Backup/restore across backends
- Simple deployment

### Backup Format

SQLite is the universal backup format for CozoDB:

```javascript
// Export any backend to SQLite
await db.backup("./backup.db");

// Import from SQLite to any backend
await db.restore("./backup.db");
```

## RocksDB Backend

**Code**: `new CozoDb('rocksdb', './path/to/directory')`

### Characteristics

- LSM-tree based storage
- Optimized for high write throughput
- Multiple files in directory
- Configurable via environment variables

### Configuration

```javascript
// Set before creating database
process.env.COZO_ROCKSDB_WRITE_BUFFER_SIZE = "134217728"; // 128MB
process.env.COZO_ROCKSDB_MAX_WRITE_BUFFER_NUMBER = "4";
process.env.COZO_ROCKSDB_TARGET_FILE_SIZE_BASE = "67108864"; // 64MB
```

### Best For

- Production servers
- High-throughput OLTP
- Large datasets
- Write-heavy workloads

### Build Requirements

- May require Rust toolchain for building from source
- Pre-built binaries available for most platforms

## TiKV Backend

**Code**: Requires special setup with TiKV cluster

### Characteristics

- Distributed storage
- Raft consensus for reliability
- Horizontal scalability
- Higher latency than local storage

### Best For

- Petabyte-scale data
- Multi-node deployments
- High availability requirements

### Limitations

- Time travel NOT supported
- Network latency (10-100x slower for graph traversal)
- Complex operational overhead

## Browser WASM

**Code**: See `browser-wasm-setup.md`

### Characteristics

- In-memory only (like Memory backend)
- Runs in browser via WebAssembly
- ~Near-native performance
- No native persistence

### Persistence Workaround

Use IndexedDB export/import pattern (see `browser-wasm-setup.md`).

## Decision Guide

```
Need persistence?
├─ No → Memory
└─ Yes
    └─ Browser environment?
        ├─ Yes → WASM + IndexedDB
        └─ No (Node.js)
            └─ Distributed?
                ├─ Yes → TiKV
                └─ No
                    └─ High write throughput?
                        ├─ Yes → RocksDB
                        └─ No → SQLite
```

## Performance Considerations

### Index Design

CozoDB uses **covering indices** - index contains data itself.

**Critical**: Column order in keys affects query performance dramatically.

- Put frequently filtered columns first
- Put low-cardinality columns before high-cardinality

```datalog
# Good: department (low cardinality) first
:create employees {
    department: String,
    employee_id: Int
    =>
    name: String
}

# Query on department is fast
?[name] := *employees{department: 'Engineering', name}
```

### Memory Management

- RocksDB: Uses jemalloc allocator
- WASM: Limited by browser memory (~1-4GB)
- Large results: Use `:limit` to avoid memory exhaustion
