# Contributing to CozoDB Connector Skill

Thank you for your interest in contributing! This guide covers the development workflow, coding standards, and review expectations.

## Getting Started

```bash
# Clone the repository
git clone https://github.com/<org>/skills-cozodb-connector.git
cd skills-cozodb-connector

# Install dependencies
npm ci

# Run tests
npm test

# Run linter
npm run lint
```

## Development Workflow

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. **Make your changes** in the appropriate files under `scripts/`.
3. **Add or update tests** in `scripts/__tests__/`. All public APIs must have test coverage.
4. **Run lint and tests** before committing:
   ```bash
   npm run lint
   npm test
   ```
5. **Commit using [Conventional Commits](https://www.conventionalcommits.org/)**:
   ```
   feat: add new query builder for aggregations
   fix: handle empty schema in buildCreateQuery
   docs: update edge-cases with HNSW limitation
   test: add coverage for tenant manager cleanup
   ```
6. **Open a Pull Request** against `main`.

## Project Structure

```
scripts/              # Core library modules
  cozo-wrapper.js     # Query builders, executor, repository pattern
  cozo-errors.js      # Structured error handling with i18n
  memory-monitor.js   # WASM memory tracking and threshold alerts
  sync-helper.js      # Bidirectional sync between local and server
  __tests__/          # Unit tests (node:test runner)
references/           # Reference documentation
examples/             # Working integration examples
docs/                 # Project-level documentation
```

## Testing

- Test runner: Node.js built-in `node:test` (no external test frameworks)
- Assertion library: `node:assert/strict`
- Run with: `npm test`
- All tests must pass before a PR can be merged (enforced by CI)

### Writing Tests

```javascript
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("myFunction", () => {
  it("does something expected", () => {
    assert.equal(myFunction("input"), "expected");
  });
});
```

## Linting

- Linter: ESLint v9 with flat config (`eslint.config.mjs`)
- Run with: `npm run lint`
- Warnings for unused variables (except `_`-prefixed args)
- No custom style rules — uses ESLint recommended defaults

## Code Style

- **CommonJS** module format (`require` / `module.exports`)
- **Functional style**: prefer pure functions, `Object.freeze()` for immutable return values
- **JSDoc comments** on all public functions (`/** @param ... @returns ... */`)
- **No runtime dependencies**: use only Node.js built-in modules

## Pull Request Checklist

- [ ] All existing tests pass (`npm test`)
- [ ] Linter passes with no errors (`npm run lint`)
- [ ] New public APIs have JSDoc comments
- [ ] New features have corresponding tests
- [ ] Commit messages follow Conventional Commits
- [ ] Documentation updated if behavior changed

## Release Process

Releases are managed with `standard-version`:

```bash
npm run release        # Bump version, update CHANGELOG.md, create git tag
git push --follow-tags # Push commit and tag
```

Only maintainers with write access should run releases.
