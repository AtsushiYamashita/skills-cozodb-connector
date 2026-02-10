const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    ErrorCodes,
    DefaultMessages,
    CozoError,
    parseNativeError,
    SecurityValidator
} = require('../cozo-errors');

// ============================================
// ErrorCodes Tests
// ============================================

describe('ErrorCodes', () => {
    it('contains all expected categories', () => {
        // Connection
        assert.ok(ErrorCodes.COZO_CONN_INIT_FAILED);
        assert.ok(ErrorCodes.COZO_CONN_WASM_LOAD_FAILED);
        assert.ok(ErrorCodes.COZO_CONN_BACKEND_UNAVAILABLE);

        // Query
        assert.ok(ErrorCodes.COZO_QUERY_SYNTAX_ERROR);
        assert.ok(ErrorCodes.COZO_QUERY_EXECUTION_FAILED);
        assert.ok(ErrorCodes.COZO_QUERY_TIMEOUT);

        // Schema
        assert.ok(ErrorCodes.COZO_SCHEMA_RELATION_EXISTS);
        assert.ok(ErrorCodes.COZO_SCHEMA_RELATION_NOT_FOUND);

        // Data
        assert.ok(ErrorCodes.COZO_DATA_KEY_VIOLATION);

        // Security
        assert.ok(ErrorCodes.COZO_SEC_INVALID_INPUT);
        assert.ok(ErrorCodes.COZO_SEC_PARAM_INJECTION);
    });

    it('has matching default messages for all codes', () => {
        for (const code of Object.values(ErrorCodes)) {
            assert.ok(DefaultMessages[code], `Missing default message for ${code}`);
        }
    });
});

// ============================================
// CozoError Tests
// ============================================

describe('CozoError', () => {
    it('creates error with code and default message', () => {
        const err = new CozoError(ErrorCodes.COZO_QUERY_SYNTAX_ERROR);

        assert.equal(err.name, 'CozoError');
        assert.equal(err.code, 'COZO_QUERY_SYNTAX_ERROR');
        assert.equal(err.message, 'Datalog query syntax error');
        assert.ok(err.timestamp);
    });

    it('includes detail and context', () => {
        const err = new CozoError(
            ErrorCodes.COZO_QUERY_SYNTAX_ERROR,
            'unexpected token at line 3',
            { query: '?[a] <- bad' }
        );

        assert.equal(err.detail, 'unexpected token at line 3');
        assert.deepEqual(err.context, { query: '?[a] <- bad' });
    });

    it('toI18n() returns structured object', () => {
        const err = new CozoError(ErrorCodes.COZO_DATA_NOT_FOUND, 'row missing');
        const i18n = err.toI18n();

        assert.equal(i18n.code, 'COZO_DATA_NOT_FOUND');
        assert.equal(i18n.defaultMessage, 'Data not found');
        assert.equal(i18n.detail, 'row missing');
        assert.ok(i18n.timestamp);
    });

    it('toJSON() returns valid JSON string', () => {
        const err = new CozoError(ErrorCodes.COZO_UNKNOWN_ERROR);
        const json = err.toJSON();
        const parsed = JSON.parse(json);

        assert.equal(parsed.code, 'COZO_UNKNOWN_ERROR');
    });

    it('is an instance of Error', () => {
        const err = new CozoError(ErrorCodes.COZO_UNKNOWN_ERROR);
        assert.ok(err instanceof Error);
    });
});

// ============================================
// parseNativeError Tests
// ============================================

describe('parseNativeError', () => {
    it('maps syntax errors', () => {
        const err = parseNativeError('Parse error at line 3');
        assert.equal(err.code, ErrorCodes.COZO_QUERY_SYNTAX_ERROR);
    });

    it('maps "relation already exists" errors', () => {
        const err = parseNativeError('Relation users already exists');
        assert.equal(err.code, ErrorCodes.COZO_SCHEMA_RELATION_EXISTS);
    });

    it('maps "relation not found" errors', () => {
        const err = parseNativeError('Relation foo does not exist');
        assert.equal(err.code, ErrorCodes.COZO_SCHEMA_RELATION_NOT_FOUND);
    });

    it('maps type mismatch errors', () => {
        const err = parseNativeError('Type mismatch: expected Int');
        assert.equal(err.code, ErrorCodes.COZO_SCHEMA_TYPE_ERROR);
    });

    it('maps key violation errors', () => {
        const err = parseNativeError('Primary key violation on id=1');
        assert.equal(err.code, ErrorCodes.COZO_DATA_KEY_VIOLATION);
    });

    it('maps timeout errors', () => {
        const err = parseNativeError('Query timeout after 30s');
        assert.equal(err.code, ErrorCodes.COZO_QUERY_TIMEOUT);
    });

    it('maps WASM memory errors', () => {
        const err = parseNativeError('RuntimeError: memory access out of bounds');
        assert.equal(err.code, ErrorCodes.COZO_CONN_WASM_LOAD_FAILED);
    });

    it('maps backend unavailable errors', () => {
        const err = parseNativeError("Invalid engine 'rocksdb'");
        assert.equal(err.code, ErrorCodes.COZO_CONN_BACKEND_UNAVAILABLE);
    });

    it('returns unknown for unrecognized errors', () => {
        const err = parseNativeError('Something completely unexpected');
        assert.equal(err.code, ErrorCodes.COZO_UNKNOWN_ERROR);
    });

    it('handles Error objects', () => {
        const err = parseNativeError(new Error('Syntax error in query'));
        assert.equal(err.code, ErrorCodes.COZO_QUERY_SYNTAX_ERROR);
    });

    it('handles result objects with ok=false', () => {
        const err = parseNativeError({ ok: false, message: 'Query timeout exceeded' });
        assert.equal(err.code, ErrorCodes.COZO_QUERY_TIMEOUT);
    });
});

// ============================================
// SecurityValidator Tests
// ============================================

describe('SecurityValidator', () => {
    describe('validateQuery', () => {
        it('accepts valid query strings', () => {
            assert.ok(SecurityValidator.validateQuery('?[a] <- [[1]]'));
        });

        it('rejects non-string input', () => {
            assert.throws(
                () => SecurityValidator.validateQuery(123),
                { name: 'CozoError' }
            );
            assert.throws(
                () => SecurityValidator.validateQuery(null),
                { name: 'CozoError' }
            );
        });

        it('rejects queries exceeding max length', () => {
            const longQuery = 'a'.repeat(SecurityValidator.MAX_QUERY_LENGTH + 1);
            assert.throws(
                () => SecurityValidator.validateQuery(longQuery),
                (err) => {
                    assert.equal(err.code, ErrorCodes.COZO_SEC_QUERY_TOO_LONG);
                    return true;
                }
            );
        });
    });

    describe('validateParams', () => {
        it('accepts valid params objects', () => {
            assert.ok(SecurityValidator.validateParams({ key: 'value' }));
        });

        it('accepts null/undefined', () => {
            assert.ok(SecurityValidator.validateParams(null));
            assert.ok(SecurityValidator.validateParams(undefined));
        });

        it('rejects arrays', () => {
            assert.throws(
                () => SecurityValidator.validateParams([1, 2]),
                { name: 'CozoError' }
            );
        });

        it('detects prototype pollution: __proto__', () => {
            // JSON.parse('{"__proto__":{}}') creates a real enumerable property
            const malicious = JSON.parse('{"__proto__":{"polluted":true}}');
            assert.throws(
                () => SecurityValidator.validateParams(malicious),
                (err) => {
                    assert.equal(err.code, ErrorCodes.COZO_SEC_PARAM_INJECTION);
                    return true;
                }
            );
        });

        it('detects prototype pollution: constructor', () => {
            assert.throws(
                () => SecurityValidator.validateParams({ constructor: {} }),
                (err) => {
                    assert.equal(err.code, ErrorCodes.COZO_SEC_PARAM_INJECTION);
                    return true;
                }
            );
        });

        it('detects prototype pollution: prototype', () => {
            assert.throws(
                () => SecurityValidator.validateParams({ prototype: {} }),
                (err) => {
                    assert.equal(err.code, ErrorCodes.COZO_SEC_PARAM_INJECTION);
                    return true;
                }
            );
        });
    });

    describe('sanitizeString', () => {
        it('escapes single quotes', () => {
            assert.equal(SecurityValidator.sanitizeString("it's"), "it''s");
        });

        it('handles strings without quotes', () => {
            assert.equal(SecurityValidator.sanitizeString('hello'), 'hello');
        });

        it('rejects non-string input', () => {
            assert.throws(
                () => SecurityValidator.sanitizeString(42),
                { name: 'CozoError' }
            );
        });
    });
});
