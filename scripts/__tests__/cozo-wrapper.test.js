const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    buildCreateQuery,
    buildPutQuery,
    buildSelectQuery,
    buildDeleteQuery,
    createExecutor,
    createTenantManager,
    createRepository
} = require('../cozo-wrapper');

// ============================================
// Query Builder Tests (Pure Functions)
// ============================================

describe('buildCreateQuery', () => {
    it('generates valid :create syntax with key and value fields', () => {
        const query = buildCreateQuery('users', {
            keyFields: [{ name: 'id', type: 'Int' }],
            valueFields: [
                { name: 'name', type: 'String' },
                { name: 'email', type: 'String' }
            ]
        });

        assert.ok(query.includes(':create users'));
        assert.ok(query.includes('id: Int'));
        assert.ok(query.includes('=>'));
        assert.ok(query.includes('name: String'));
        assert.ok(query.includes('email: String'));
    });

    it('includes default values when specified', () => {
        const query = buildCreateQuery('posts', {
            keyFields: [{ name: 'id', type: 'Int' }],
            valueFields: [
                { name: 'created_at', type: 'Float', default: 'now()' }
            ]
        });

        assert.ok(query.includes('default now()'));
    });

    it('handles empty valueFields', () => {
        const query = buildCreateQuery('edges', {
            keyFields: [
                { name: 'from', type: 'Int' },
                { name: 'to', type: 'Int' }
            ],
            valueFields: []
        });

        assert.ok(query.includes(':create edges'));
        assert.ok(query.includes('from: Int'));
        assert.ok(query.includes('to: Int'));
    });
});

describe('buildPutQuery', () => {
    it('generates :put with JSON data', () => {
        const query = buildPutQuery('users', ['id'], ['name'], [[1, 'Alice']]);

        assert.ok(query.includes('?[id, name]'));
        assert.ok(query.includes(':put users'));
        assert.ok(query.includes('{id => name}'));
        assert.ok(query.includes('[[1,"Alice"]]'));
    });

    it('handles multiple rows', () => {
        const data = [[1, 'Alice'], [2, 'Bob']];
        const query = buildPutQuery('users', ['id'], ['name'], data);

        assert.ok(query.includes('[[1,"Alice"],[2,"Bob"]]'));
    });
});

describe('buildSelectQuery', () => {
    it('generates basic select', () => {
        const query = buildSelectQuery('users', ['id', 'name']);

        assert.ok(query.includes('?[id, name]'));
        assert.ok(query.includes('*users{id, name}'));
    });

    it('adds filter clause', () => {
        const query = buildSelectQuery('users', ['name'], { filter: 'age > 25' });

        assert.ok(query.includes('age > 25'));
    });

    it('adds orderBy and limit', () => {
        const query = buildSelectQuery('users', ['name'], {
            orderBy: '-age',
            limit: 10
        });

        assert.ok(query.includes(':order -age'));
        assert.ok(query.includes(':limit 10'));
    });

    it('works with no options', () => {
        const query = buildSelectQuery('users', ['id']);

        assert.ok(!query.includes(':order'));
        assert.ok(!query.includes(':limit'));
    });
});

describe('buildDeleteQuery', () => {
    it('generates :rm syntax', () => {
        const query = buildDeleteQuery('users', ['id', 'name'], [[1, 'Alice']]);

        assert.ok(query.includes('?[id, name]'));
        assert.ok(query.includes(':rm users'));
        assert.ok(query.includes('{id, name}'));
    });
});

// ============================================
// Executor Tests (with Mock Backend)
// ============================================

describe('createExecutor', () => {
    const createMockBackend = (responses = {}) => ({
        run: async (query, params) => {
            if (responses.error) return { ok: false, message: responses.error };
            return { ok: true, headers: ['col1'], rows: responses.rows || [] };
        }
    });

    it('run() returns parsed result from backend', async () => {
        const backend = createMockBackend({ rows: [['hello']] });
        const exec = createExecutor(backend);

        const result = await exec.run('?[a] <- [[1]]');
        assert.equal(result.ok, true);
        assert.deepEqual(result.rows, [['hello']]);
    });

    it('query() returns rows on success', async () => {
        const backend = createMockBackend({ rows: [['Alice'], ['Bob']] });
        const exec = createExecutor(backend);

        const rows = await exec.query('?[name] := *users{name}');
        assert.deepEqual(rows, [['Alice'], ['Bob']]);
    });

    it('query() throws on error', async () => {
        const backend = createMockBackend({ error: 'Test error' });
        const exec = createExecutor(backend);

        await assert.rejects(
            () => exec.query('bad query'),
            { message: 'Test error' }
        );
    });

    it('mutate() returns success with affected count', async () => {
        const backend = createMockBackend({ rows: [[1]] });
        const exec = createExecutor(backend);

        const result = await exec.mutate(':create test {}');
        assert.equal(result.success, true);
        assert.equal(result.affected, 1);
    });

    it('mutate() throws on error', async () => {
        const backend = createMockBackend({ error: 'Mutation failed' });
        const exec = createExecutor(backend);

        await assert.rejects(
            () => exec.mutate(':create test {}'),
            { message: 'Mutation failed' }
        );
    });

    it('handles WASM backend (synchronous JSON API)', async () => {
        const wasmBackend = {
            run: (query, paramsJson) => {
                return JSON.stringify({ ok: true, rows: [['wasm']] });
            }
        };
        const exec = createExecutor(wasmBackend, { isWasm: true });

        const result = await exec.run('?[a] <- [[1]]');
        assert.equal(result.ok, true);
        assert.deepEqual(result.rows, [['wasm']]);
    });

    it('returned executor is frozen (immutable)', () => {
        const backend = createMockBackend();
        const exec = createExecutor(backend);

        assert.ok(Object.isFrozen(exec));
    });
});

// ============================================
// TenantManager Tests
// ============================================

describe('createTenantManager', () => {
    it('creates and retrieves tenant executors', () => {
        const mockFactory = (backend, path) => ({
            run: async () => ({ ok: true, rows: [] })
        });

        const manager = createTenantManager(mockFactory, {
            basePath: '/tmp/test',
            backend: 'memory'
        });

        const exec1 = manager.getDb('tenant-a');
        const exec2 = manager.getDb('tenant-b');

        assert.ok(exec1);
        assert.ok(exec2);
        assert.notEqual(exec1, exec2);
    });

    it('returns same executor for same tenant', () => {
        const mockFactory = () => ({
            run: async () => ({ ok: true, rows: [] })
        });

        const manager = createTenantManager(mockFactory);

        const exec1 = manager.getDb('same-tenant');
        const exec2 = manager.getDb('same-tenant');

        assert.equal(exec1, exec2);
    });

    it('tracks tenant count', () => {
        const mockFactory = () => ({
            run: async () => ({ ok: true, rows: [] })
        });

        const manager = createTenantManager(mockFactory);
        manager.getDb('t1');
        manager.getDb('t2');

        assert.equal(manager.getTenantCount(), 2);
        assert.deepEqual(manager.listTenants(), ['t1', 't2']);
    });

    it('closeDb removes tenant', () => {
        const mockFactory = () => ({
            run: async () => ({ ok: true, rows: [] })
        });

        const manager = createTenantManager(mockFactory);
        manager.getDb('t1');
        manager.closeDb('t1');

        assert.equal(manager.getTenantCount(), 0);
    });
});

// ============================================
// Repository Tests
// ============================================

describe('createRepository', () => {
    const createMockExecutor = (queryRows = []) => ({
        query: async (q, params) => queryRows,
        mutate: async (q) => ({ success: true, affected: 1 })
    });

    it('findAll returns all rows', async () => {
        const exec = createMockExecutor([[1, 'Alice'], [2, 'Bob']]);
        const repo = createRepository(exec, 'users', {
            keys: ['id'],
            values: ['name']
        });

        const rows = await repo.findAll();
        assert.deepEqual(rows, [[1, 'Alice'], [2, 'Bob']]);
    });

    it('save calls mutate with correct put query', async () => {
        let capturedQuery = '';
        const exec = {
            query: async () => [],
            mutate: async (q) => { capturedQuery = q; return { success: true, affected: 1 }; }
        };

        const repo = createRepository(exec, 'users', {
            keys: ['id'],
            values: ['name']
        });

        await repo.save({ id: 1, name: 'Alice' });
        assert.ok(capturedQuery.includes(':put users'));
        assert.ok(capturedQuery.includes('{id => name}'));
    });

    it('returned repository is frozen', () => {
        const exec = createMockExecutor();
        const repo = createRepository(exec, 'users', {
            keys: ['id'],
            values: ['name']
        });

        assert.ok(Object.isFrozen(repo));
    });
});
