/**
 * CozoDB Memory Monitor
 * 
 * Tracks memory usage in WASM environment and triggers
 * offload to server when approaching limits.
 * 
 * Key features:
 * - Write tracking (bytes written estimation)
 * - Configurable thresholds
 * - Overflow callbacks for server offload
 * - Usage statistics
 * 
 * @module memory-monitor
 */

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS = Object.freeze({
    maxBytes: 50 * 1024 * 1024,  // 50MB default
    warningThreshold: 0.8,       // 80% warning
    criticalThreshold: 0.95,     // 95% critical
    estimateMultiplier: 2.5      // UTF-16 + overhead
});

// ============================================
// Memory Monitor (Pure Functional)
// ============================================

/**
 * Create memory state object (immutable)
 */
const createMemoryState = (bytesWritten = 0, rowCount = 0) => 
    Object.freeze({ bytesWritten, rowCount, createdAt: Date.now() });

/**
 * Estimate data size in bytes
 * Conservative estimate accounting for UTF-16 and CozoDB overhead
 */
const estimateDataSize = (data, multiplier = DEFAULT_OPTIONS.estimateMultiplier) => {
    const jsonSize = JSON.stringify(data).length;
    return Math.ceil(jsonSize * multiplier);
};

/**
 * Calculate memory usage percentage
 */
const calculateUsagePercent = (bytesWritten, maxBytes) => 
    Math.min(bytesWritten / maxBytes, 1.0);

/**
 * Determine memory status
 */
const getMemoryStatus = (usagePercent, options = DEFAULT_OPTIONS) => {
    if (usagePercent >= options.criticalThreshold) return 'critical';
    if (usagePercent >= options.warningThreshold) return 'warning';
    return 'ok';
};

// ============================================
// Memory Monitor Class
// ============================================

/**
 * Creates a memory-aware database wrapper
 * 
 * @param {Object} db - CozoDB instance (Node.js or WASM)
 * @param {Object} options - Configuration options
 * @param {number} options.maxBytes - Maximum bytes before overflow
 * @param {Function} options.onWarning - Called at warning threshold
 * @param {Function} options.onCritical - Called at critical threshold
 * @param {Function} options.onOverflow - Called when max exceeded
 * @param {boolean} options.isWasm - Is this a WASM instance
 * @returns {Object} Memory-monitored executor
 */
const createMemoryMonitor = (db, options = {}) => {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const { maxBytes, onWarning, onCritical, onOverflow, isWasm = false } = config;
    
    // Mutable state (encapsulated)
    let state = createMemoryState();
    let lastStatus = 'ok';
    
    /**
     * Check thresholds and fire callbacks
     */
    const checkThresholds = async () => {
        const usagePercent = calculateUsagePercent(state.bytesWritten, maxBytes);
        const currentStatus = getMemoryStatus(usagePercent, config);
        
        // Only fire callback on status change
        if (currentStatus !== lastStatus) {
            if (currentStatus === 'warning' && onWarning) {
                await onWarning(getStats());
            } else if (currentStatus === 'critical' && onCritical) {
                await onCritical(getStats());
            }
            lastStatus = currentStatus;
        }
        
        // Always fire overflow if exceeded
        if (state.bytesWritten > maxBytes && onOverflow) {
            await onOverflow(getStats());
        }
        
        return currentStatus;
    };
    
    /**
     * Execute query with write tracking
     */
    const run = async (query, params = {}) => {
        // Estimate query size
        const querySize = estimateDataSize(query);
        const paramsSize = estimateDataSize(params);
        
        // Execute query
        let result;
        if (isWasm) {
            const rawResult = db.run(query, JSON.stringify(params));
            result = JSON.parse(rawResult);
        } else {
            result = await db.run(query, params);
        }
        
        // Track writes (only for mutations)
        if (query.includes(':put') || query.includes(':create')) {
            const writeSize = querySize + paramsSize;
            state = createMemoryState(
                state.bytesWritten + writeSize,
                state.rowCount + (result.rows?.length || 1)
            );
            await checkThresholds();
        }
        
        return result;
    };
    
    /**
     * Get current memory statistics
     */
    const getStats = () => Object.freeze({
        bytesWritten: state.bytesWritten,
        rowCount: state.rowCount,
        maxBytes,
        usagePercent: calculateUsagePercent(state.bytesWritten, maxBytes),
        status: getMemoryStatus(calculateUsagePercent(state.bytesWritten, maxBytes), config),
        runtimeMs: Date.now() - state.createdAt
    });
    
    /**
     * Reset memory tracking (after successful offload)
     */
    const reset = () => {
        state = createMemoryState();
        lastStatus = 'ok';
    };
    
    /**
     * Manually add to byte count (for external writes)
     */
    const trackBytes = async (bytes) => {
        state = createMemoryState(
            state.bytesWritten + bytes,
            state.rowCount
        );
        await checkThresholds();
    };
    
    return Object.freeze({
        run,
        getStats,
        reset,
        trackBytes,
        
        // Expose pure functions for testing
        _estimateDataSize: estimateDataSize,
        _calculateUsagePercent: calculateUsagePercent,
        _getMemoryStatus: getMemoryStatus
    });
};

// ============================================
// Volatility Warning
// ============================================

/**
 * Log volatility warning (call on init)
 */
const warnVolatility = (environment = 'browser') => {
    const message = environment === 'browser'
        ? '[CozoDB] ⚠️ WASM data is VOLATILE. Data will be lost on page refresh. Use sync() to persist to server.'
        : '[CozoDB] Using in-memory backend. Data will be lost on process exit.';
    
    console.warn(message);
    return message;
};

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createMemoryMonitor,
        createMemoryState,
        estimateDataSize,
        calculateUsagePercent,
        getMemoryStatus,
        warnVolatility,
        DEFAULT_OPTIONS
    };
}

if (typeof window !== 'undefined') {
    window.CozoMemoryMonitor = {
        createMemoryMonitor,
        warnVolatility,
        DEFAULT_OPTIONS
    };
}

export {
    createMemoryMonitor,
    createMemoryState,
    estimateDataSize,
    calculateUsagePercent,
    getMemoryStatus,
    warnVolatility,
    DEFAULT_OPTIONS
};
