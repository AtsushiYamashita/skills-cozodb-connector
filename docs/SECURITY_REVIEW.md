# Security Review Document

## Overview

This document captures the security review performed on the CozoDB Connector Skill.
Review conducted using left-shift security principles (security-first design).

## Code Reviewed

| File                          | Type                 | Risk Level                 |
| ----------------------------- | -------------------- | -------------------------- |
| `scripts/cozo-errors.js`      | Security/i18n module | Low (mitigations built in) |
| `examples/nodejs-spike/*.js`  | Example code         | Low                        |
| `examples/browser-spike/*.js` | PWA code             | Medium (browser context)   |

## Security Analysis

### 1. Query Injection

**Risk**: Datalog query injection via string concatenation

**Finding**: CozoDB uses parameterized queries (`$param` syntax) which prevents injection when used correctly.

**Mitigations in Place**:

- `SecurityValidator.validateQuery()` - validates query length
- `SecurityValidator.validateParams()` - checks for prototype pollution
- `SecurityValidator.sanitizeString()` - escapes single quotes

**Recommendation**: Always use parameterized queries:

```javascript
// SAFE
await db.run(`?[name] := *users{name}, name == $search`, { search: userInput });

// UNSAFE - DO NOT DO THIS
await db.run(`?[name] := *users{name}, name == '${userInput}'`); // Injection risk!
```

### 2. Prototype Pollution

**Risk**: Malicious parameters like `__proto__` could poison Object.prototype

**Finding**: `validateParams()` blocks suspicious keys including:

- `__proto__`
- `constructor`
- `prototype`

**Status**: ✅ Mitigated

### 3. Denial of Service (Query)

**Risk**: Excessively large queries could exhaust memory

**Finding**: `MAX_QUERY_LENGTH = 100000` (100KB) limit enforced

**Status**: ✅ Mitigated

### 4. Browser WASM Security

**Risk**: CDN-loaded WASM could be tampered with (supply chain attack)

**Finding**: Current implementation uses `esm.sh` CDN which proxies npm packages

**Recommendation**:

- For production, bundle WASM locally
- Use Subresource Integrity (SRI) if loading from CDN
- Consider Content Security Policy (CSP) headers

### 5. Data Persistence (Browser)

**Risk**: IndexedDB data accessible to page scripts (XSS exposure)

**Finding**: `indexeddb-persistence.js` stores full database export in IndexedDB

**Recommendation**:

- Do not store sensitive data in browser CozoDB
- Consider encryption for sensitive data
- Implement proper CSP to prevent XSS

### 6. Error Message Information Disclosure

**Risk**: Detailed error messages could leak schema/query details

**Finding**: `CozoError.toI18n()` separates code from detail, allowing:

- Show code + default message to users
- Log full detail server-side only

**Status**: ✅ Designed for safe error handling

## i18n Security Considerations

Error codes (e.g., `COZO_QUERY_SYNTAX_ERROR`) are:

- Language-agnostic identifiers
- Safe to display without translation
- Do not contain user input or sensitive data

## Test Runner Security

- Test runners use hardcoded test data (no user input)
- Test file cleanup performed after tests
- JSON output does not include sensitive data

## Recommendations Summary

| Priority | Recommendation                                   |
| -------- | ------------------------------------------------ |
| High     | Always use parameterized queries with user input |
| High     | Bundle WASM locally for production               |
| Medium   | Implement CSP headers for browser apps           |
| Medium   | Do not store sensitive data in browser CozoDB    |
| Low      | Add SRI hashes if using CDN                      |

## Conclusion

The CozoDB Connector Skill implements several security best practices:

- Input validation and sanitization utilities
- Prototype pollution protection
- i18n-friendly error handling that separates codes from details
- Query length limits

Main remaining risks are:

- Developer misuse (string concatenation instead of parameters)
- Browser-specific attack surface (XSS, supply chain)

These are documented in `references/edge-cases.md` with guidance.

---

_Review Date: 2026-02-09_
_Reviewer: Security Subagent_
