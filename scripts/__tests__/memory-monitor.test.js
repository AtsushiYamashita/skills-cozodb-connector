const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
    createMemoryMonitor,
    createMemoryState,
    estimateDataSize,
    calculateUsagePercent,
    getMemoryStatus,
    warnVolatility,
    DEFAULT_OPTIONS
} = require('../memory-monitor');

// ============================================
// Pure Function Tests
// ============================================

describe('estimateDataSize', () => {
    it('estimates size with default multiplier', () => {
        const size = estimateDataSize('hello');
        // JSON.stringify('hello') = '"hello"' = 7 chars
        // 7 * 2.5 = 17.5 → ceil = 18
        assert.equal(size, 18);
    });

    it('estimates size with custom multiplier', () => {
        const size = estimateDataSize('hi', 1.0);
        // '"hi"' = 4 chars * 1.0 = 4
        assert.equal(size, 4);
    });

    it('handles objects', () => {
        const size = estimateDataSize({ key: 'value' });
        assert.ok(size > 0);
    });

    it('handles arrays', () => {
        const size = estimateDataSize([1, 2, 3]);
        assert.ok(size > 0);
    });
});

describe('calculateUsagePercent', () => {
    it('returns 0 for no usage', () => {
        assert.equal(calculateUsagePercent(0, 100), 0);
    });

    it('returns 0.5 for half usage', () => {
        assert.equal(calculateUsagePercent(50, 100), 0.5);
    });

    it('caps at 1.0 when exceeding max', () => {
        assert.equal(calculateUsagePercent(200, 100), 1.0);
    });

    it('returns 1.0 for exact max', () => {
        assert.equal(calculateUsagePercent(100, 100), 1.0);
    });
});

describe('getMemoryStatus', () => {
    it('returns ok for low usage', () => {
        assert.equal(getMemoryStatus(0.5), 'ok');
    });

    it('returns warning at 80% threshold', () => {
        assert.equal(getMemoryStatus(0.8), 'warning');
    });

    it('returns warning between 80% and 95%', () => {
        assert.equal(getMemoryStatus(0.9), 'warning');
    });

    it('returns critical at 95% threshold', () => {
        assert.equal(getMemoryStatus(0.95), 'critical');
    });

    it('returns critical above 95%', () => {
        assert.equal(getMemoryStatus(0.99), 'critical');
    });

    it('respects custom thresholds', () => {
        const custom = { warningThreshold: 0.5, criticalThreshold: 0.7 };
        assert.equal(getMemoryStatus(0.6, custom), 'warning');
        assert.equal(getMemoryStatus(0.75, custom), 'critical');
    });
});

describe('createMemoryState', () => {
    it('creates frozen state with defaults', () => {
        const state = createMemoryState();
        assert.equal(state.bytesWritten, 0);
        assert.equal(state.rowCount, 0);
        assert.ok(state.createdAt > 0);
        assert.ok(Object.isFrozen(state));
    });

    it('creates state with provided values', () => {
        const state = createMemoryState(1024, 10);
        assert.equal(state.bytesWritten, 1024);
        assert.equal(state.rowCount, 10);
    });
});

describe('DEFAULT_OPTIONS', () => {
    it('has expected defaults', () => {
        assert.equal(DEFAULT_OPTIONS.maxBytes, 50 * 1024 * 1024);
        assert.equal(DEFAULT_OPTIONS.warningThreshold, 0.8);
        assert.equal(DEFAULT_OPTIONS.criticalThreshold, 0.95);
        assert.equal(DEFAULT_OPTIONS.estimateMultiplier, 2.5);
    });

    it('is frozen', () => {
        assert.ok(Object.isFrozen(DEFAULT_OPTIONS));
    });
});

// ============================================
// Monitor Integration Tests (Mock DB)
// ============================================

describe('createMemoryMonitor', () => {
    const createMockDb = () => ({
        run: async (query, params) => ({ ok: true, rows: [] })
    });

    it('starts with clean stats', () => {
        const monitor = createMemoryMonitor(createMockDb());
        const stats = monitor.getStats();

        assert.equal(stats.bytesWritten, 0);
        assert.equal(stats.rowCount, 0);
        assert.equal(stats.status, 'ok');
        assert.equal(stats.usagePercent, 0);
    });

    it('tracks writes from :put queries', async () => {
        const monitor = createMemoryMonitor(createMockDb(), { maxBytes: 10000 });
        await monitor.run('?[id] <- [[1]] :put test {id}');

        const stats = monitor.getStats();
        assert.ok(stats.bytesWritten > 0);
        assert.ok(stats.rowCount > 0);
    });

    it('does not track reads', async () => {
        const monitor = createMemoryMonitor(createMockDb());
        await monitor.run('?[id] := *test{id}');

        const stats = monitor.getStats();
        assert.equal(stats.bytesWritten, 0);
    });

    it('fires warning callback at threshold', async () => {
        let warningFired = false;
        // Use large maxBytes so written data lands between warning (10%) and critical (95%)
        const monitor = createMemoryMonitor(createMockDb(), {
            maxBytes: 500,
            warningThreshold: 0.1,
            criticalThreshold: 0.95,
            onWarning: () => { warningFired = true; }
        });

        await monitor.run('?[id] <- [[1]] :put test {id}');

        assert.ok(warningFired);
    });


    it('reset clears all tracking', async () => {
        const monitor = createMemoryMonitor(createMockDb());
        await monitor.run('?[id] <- [[1]] :put test {id}');
        monitor.reset();

        const stats = monitor.getStats();
        assert.equal(stats.bytesWritten, 0);
        assert.equal(stats.rowCount, 0);
        assert.equal(stats.status, 'ok');
    });

    it('trackBytes adds to byte count', async () => {
        const monitor = createMemoryMonitor(createMockDb());
        await monitor.trackBytes(500);

        const stats = monitor.getStats();
        assert.equal(stats.bytesWritten, 500);
    });

    it('getStats returns frozen object', () => {
        const monitor = createMemoryMonitor(createMockDb());
        const stats = monitor.getStats();
        assert.ok(Object.isFrozen(stats));
    });

    it('returned monitor is frozen', () => {
        const monitor = createMemoryMonitor(createMockDb());
        assert.ok(Object.isFrozen(monitor));
    });
});

describe('warnVolatility', () => {
    it('returns browser warning message', () => {
        const msg = warnVolatility('browser');
        assert.ok(msg.includes('VOLATILE'));
    });

    it('returns non-browser warning message', () => {
        const msg = warnVolatility('node');
        assert.ok(msg.includes('in-memory'));
    });
});
