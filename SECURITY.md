# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Current release |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public issue.**
2. Email the maintainer directly (see `package.json` or repository owner profile).
3. Include a description of the vulnerability, reproduction steps, and potential impact.
4. You will receive a response within 48 hours.

## Security Measures

### Connector (this repository)

- **Query injection prevention**: `SecurityValidator.validateQuery()` enforces query length limits (100KB max).
- **Prototype pollution protection**: `SecurityValidator.validateParams()` blocks `__proto__`, `constructor`, `prototype` keys.
- **String sanitization**: `SecurityValidator.sanitizeString()` escapes single quotes in dynamic values.
- **Immutable API surfaces**: All public objects are `Object.freeze()`-d to prevent tampering.

### Memory Monitor

- Log output contains only aggregate statistics (bytes written, row count, usage percentage).
- **No raw user data or query content is included in log messages.**

### Dependency Audit

This project has **zero runtime dependencies**. All functionality is implemented with Node.js built-in modules.

Development dependencies:

| Package            | Purpose         | Audit Status |
| ------------------ | --------------- | ------------ |
| `eslint`           | Linting         | ✅ Clean     |
| `@eslint/js`       | ESLint config   | ✅ Clean     |
| `standard-version` | Release tooling | ✅ Clean     |

Last audit: 2026-02-11

```
npm audit --audit-level=high
# found 0 vulnerabilities
```

For a detailed security review of the codebase, see [docs/SECURITY_REVIEW.md](docs/SECURITY_REVIEW.md).
