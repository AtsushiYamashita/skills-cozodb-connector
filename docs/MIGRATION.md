# Migration Guide

This document describes breaking changes and how to migrate between major versions.

## Version 1.x → 2.x (Future)

TBD when v2 is released.

## Version 0.x → 1.0.0

### Summary

Version 1.0.0 is the first stable release. No breaking changes from pre-release versions.

### What Changed

- Formalized API contracts
- Added structured error codes (`CozoError`)
- Introduced memory monitoring for WASM
- Added sync helper for browser persistence

### Migration Steps

If you were using an earlier version:

1. **Update imports**:

   ```javascript
   // Old (pre-1.0)
   const { query } = require("./cozo-wrapper");

   // New (1.0+)
   const { createExecutor } = require("./scripts/cozo-wrapper");
   const executor = createExecutor(db);
   const rows = await executor.query("...");
   ```

2. **Error handling**:

   ```javascript
   // Old
   try {
     await db.run(query);
   } catch (err) {
     console.error(err.message);
   }

   // New
   const { parseNativeError } = require("./scripts/cozo-errors");
   try {
     await executor.run(query);
   } catch (err) {
     const cozoErr = parseNativeError(err);
     console.error(cozoErr.toI18n());
   }
   ```

3. **No other breaking changes** — All existing code should work without modification.

## Future Breaking Change Policy

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** versions may contain breaking changes
- **MINOR** and **PATCH** versions are always backward-compatible

### When we introduce breaking changes:

1. **Deprecation notice** — 1 minor version before removal
2. **Migration guide** — Updated in this document
3. **Automated migration** — Scripts provided when possible
4. **Clear changelog** — Breaking changes highlighted in `CHANGELOG.md`

## Deprecation Warnings

Currently: No deprecated APIs.

## Need Help?

If you encounter migration issues, please [open an issue](https://github.com/AtsushiYamashita/skills-cozodb-connector/issues/new?template=question.md) or email yayas505@gmail.com.
