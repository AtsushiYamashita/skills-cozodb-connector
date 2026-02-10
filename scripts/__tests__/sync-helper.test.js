const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    createSyncManager,
    createSyncRecord,
    resolveConflict,
    isLocalNewer,
    generateSyncId
} = require('../sync-helper');

// ============================================
// Pure Function Tests
// ============================================

describe('generateSyncId', () => {
    it('returns a non-empty string', () => {
        const id = generateSyncId();
        assert.ok(typeof id === 'string');
        assert.ok(id.length > 0);
    });

    it('generates unique IDs', () => {
        const ids = new Set(Array.from({ length: 100 }, () => generateSyncId()));
        assert.equal(ids.size, 100);
    });
});

describe('createSyncRecord', () => {
    it('creates record with required fields', () => {
        const record = createSyncRecord('item-1', { foo: 'bar' }, 'client-a');

        assert.equal(record.id, 'item-1');
        assert.equal(record.clientId, 'client-a');
        assert.ok(record.syncId);
        assert.ok(record.updatedAt > 0);
    });

    it('serializes object data to JSON string', () => {
        const record = createSyncRecord('item-1', { foo: 'bar' }, 'client-a');
        assert.equal(record.data, '{"foo":"bar"}');
    });

    it('keeps string data as-is', () => {
        const record = createSyncRecord('item-1', 'raw-string', 'client-a');
        assert.equal(record.data, 'raw-string');
    });

    it('returns frozen object', () => {
        const record = createSyncRecord('item-1', {}, 'client-a');
        assert.ok(Object.isFrozen(record));
    });
});

describe('isLocalNewer', () => {
    it('returns true when local is newer', () => {
        assert.equal(isLocalNewer({ updatedAt: 200 }, { updatedAt: 100 }), true);
    });

    it('returns false when server is newer', () => {
        assert.equal(isLocalNewer({ updatedAt: 100 }, { updatedAt: 200 }), false);
    });

    it('returns false when timestamps are equal', () => {
        assert.equal(isLocalNewer({ updatedAt: 100 }, { updatedAt: 100 }), false);
    });
});

describe('resolveConflict', () => {
    const local = Object.freeze({ id: 1, name: 'Local', updatedAt: 200 });
    const server = Object.freeze({ id: 1, name: 'Server', updatedAt: 100 });

    it('returns local data with "local" strategy', () => {
        const result = resolveConflict(local, server, 'local');
        assert.equal(result, local);
    });

    it('returns server data with "server" strategy', () => {
        const result = resolveConflict(local, server, 'server');
        assert.equal(result, server);
    });

    it('merges data with "merge" strategy (local overrides non-null)', () => {
        const localWithNull = { id: 1, name: 'Local', extra: null, updatedAt: 200 };
        const serverWithExtra = { id: 1, name: 'Server', extra: 'kept', updatedAt: 100 };

        const result = resolveConflict(localWithNull, serverWithExtra, 'merge');

        assert.equal(result.name, 'Local');
        assert.equal(result.updatedAt, 200);
        assert.ok(Object.isFrozen(result));
    });

    it('defaults to server for unknown strategy', () => {
        const result = resolveConflict(local, server, 'unknown');
        assert.equal(result, server);
    });

    it('defaults to server when no strategy specified', () => {
        const result = resolveConflict(local, server);
        assert.equal(result, server);
    });
});

// ============================================
// SyncManager Tests (Mock)
// ============================================

describe('createSyncManager', () => {
    const createMockLocalDb = () => ({
        query: async () => [],
        mutate: async () => ({ success: true })
    });

    it('initializes with clientId and serverUrl', () => {
        const manager = createSyncManager(createMockLocalDb(), {
            serverUrl: 'http://localhost:3000',
            clientId: 'test-client'
        });

        const info = manager.init();
        assert.equal(info.clientId, 'test-client');
        assert.equal(info.serverUrl, 'http://localhost:3000');
    });

    it('queues changes and tracks pending count', () => {
        const manager = createSyncManager(createMockLocalDb(), {
            serverUrl: 'http://localhost:3000'
        });

        const syncId = manager.queueChange('notes', 'note-1', { title: 'Test' });
        assert.ok(syncId);

        const status = manager.getStatus();
        assert.equal(status.pendingCount, 1);
    });

    it('getStatus returns correct initial state', () => {
        const manager = createSyncManager(createMockLocalDb(), {
            serverUrl: 'http://localhost:3000',
            clientId: 'c1'
        });

        const status = manager.getStatus();
        assert.equal(status.clientId, 'c1');
        assert.equal(status.lastSyncTime, 0);
        assert.equal(status.pendingCount, 0);
        assert.equal(status.isSyncing, false);
    });

    it('getStatus returns frozen object', () => {
        const manager = createSyncManager(createMockLocalDb(), {
            serverUrl: 'http://localhost:3000'
        });
        assert.ok(Object.isFrozen(manager.getStatus()));
    });

    it('returned manager is frozen', () => {
        const manager = createSyncManager(createMockLocalDb(), {
            serverUrl: 'http://localhost:3000'
        });
        assert.ok(Object.isFrozen(manager));
    });

    it('exposes internal pure functions for testing', () => {
        const manager = createSyncManager(createMockLocalDb(), {
            serverUrl: 'http://localhost:3000'
        });

        assert.equal(typeof manager._resolveConflict, 'function');
        assert.equal(typeof manager._isLocalNewer, 'function');
        assert.equal(typeof manager._createSyncRecord, 'function');
    });
});
