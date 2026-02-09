# Browser WASM CozoDB Setup

## Overview

CozoDB runs in browsers via WebAssembly (WASM). The browser version:

- Uses **in-memory storage only** (no native persistence)
- Requires WASM support (all modern browsers)
- Can persist data via IndexedDB export/import workaround

## Installation Options

### Option 1: Official Demo (Recommended for Testing)

Visit [https://www.cozodb.org/wasm-demo/](https://www.cozodb.org/wasm-demo/) for immediate testing.

### Option 2: NPM + Bundler (Recommended for Production)

```bash
npm install cozo-lib-wasm
```

```javascript
import init, { CozoDb } from "cozo-lib-wasm";

async function initDatabase() {
  await init(); // Initialize WASM
  const db = CozoDb.new();
  return db;
}
```

### Option 3: ESM CDN (Experimental)

```javascript
const cozo = await import("https://esm.sh/cozo-lib-wasm@0.7.6");
await cozo.default();
const db = cozo.CozoDb.new();
```

> **Warning**: CDN imports may have memory management issues.
> For production, bundle WASM locally.

## API Differences from Node.js

```javascript
// Browser WASM uses synchronous API with string results
const resultString = db.run("?[a] <- [[1]]"); // Returns JSON string
const result = JSON.parse(resultString);

// Compare to Node.js which returns objects directly
const result = await db.run("?[a] <- [[1]]"); // Returns object
```

## IndexedDB Persistence Pattern

Since Browser WASM is in-memory only, use this pattern to persist across sessions:

### Save Database State

```javascript
async function saveToIndexedDB(db) {
  // 1. Get all relations
  const relations = JSON.parse(db.run("::relations"));

  const exportData = {
    timestamp: Date.now(),
    relations: {},
  };

  // 2. Export each relation
  for (const [name] of relations.rows) {
    if (name.startsWith("_")) continue; // Skip system relations

    const columns = JSON.parse(db.run(`::columns ${name}`));
    const columnNames = columns.rows.map((r) => r[0]).join(", ");
    const data = JSON.parse(
      db.run(`?[${columnNames}] := *${name}{${columnNames}}`),
    );

    exportData.relations[name] = { columns: columns.rows, data: data.rows };
  }

  // 3. Store in IndexedDB
  const idb = await openIndexedDB();
  await idb.put("cozo_export", exportData);
}
```

### Load Database State

```javascript
async function loadFromIndexedDB(db) {
  const idb = await openIndexedDB();
  const exportData = await idb.get("cozo_export");

  if (!exportData) return null;

  for (const [name, { columns, data }] of Object.entries(
    exportData.relations,
  )) {
    // Recreate relation
    const columnDefs = columns.map((c) => `${c[0]}: ${c[1]}`).join(", ");
    try {
      db.run(`:create ${name} { ${columnDefs} }`);
    } catch (e) {
      /* may already exist */
    }

    // Import data
    if (data.length > 0) {
      const colNames = columns.map((c) => c[0]).join(", ");
      db.run(
        `?[${colNames}] <- ${JSON.stringify(data)} :put ${name} {${colNames}}`,
      );
    }
  }
}
```

## PWA Integration

### manifest.json

```json
{
  "name": "CozoDB PWA",
  "short_name": "CozoDB",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#4A90A4"
}
```

### Service Worker (for WASM caching)

```javascript
const CACHE_NAME = "cozo-wasm-v1";
const WASM_FILES = ["/cozo_wasm_bg.wasm", "/cozo_wasm.js"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(WASM_FILES)),
  );
});
```

## Known Limitations

1. **No Native Persistence**: All data in memory, lost on page close
2. **Memory Constraints**: Browser memory limits (~1-4GB depending on browser/device)
3. **Single Thread**: WASM runs on main thread (can block UI for large queries)
4. **CDN Issues**: Dynamic imports from CDNs may fail with memory errors

## Recommendations

- **For demos**: Use official cozodb.org WASM demo
- **For PWAs**: Bundle WASM locally + IndexedDB persistence
- **For production apps**: Consider Server-side Node.js with REST API
