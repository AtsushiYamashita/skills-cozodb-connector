/**
 * CozoDB Sync Helper
 * 
 * Provides bidirectional sync between local CozoDB (WASM/Node)
 * and a remote server. Essential for WASM volatility mitigation.
 * 
 * Features:
 * - Push local changes to server
 * - Pull server changes to local
 * - Conflict resolution strategies
 * - Offline queue management
 * - Sync status tracking
 * 
 * @module sync-helper
 */

// ============================================
// Types
// ============================================

/**
 * @typedef {Object} SyncConfig
 * @property {string} serverUrl - Base URL of sync server
 * @property {string} clientId - Unique client identifier
 * @property {Function} onConflict - Conflict resolution callback
 * @property {Function} onSyncStart - Called when sync starts
 * @property {Function} onSyncComplete - Called when sync completes
 * @property {Function} onSyncError - Called on sync error
 */

/**
 * @typedef {'local'|'server'|'merge'|'manual'} ConflictStrategy
 */

// ============================================
// Pure Functions
// ============================================

/**
 * Generate unique sync ID
 */
const generateSyncId = () => 
    `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create sync record from local data
 */
const createSyncRecord = (id, data, clientId) => Object.freeze({
    id,
    data: typeof data === 'string' ? data : JSON.stringify(data),
    clientId,
    updatedAt: Date.now() / 1000,
    syncId: generateSyncId()
});

/**
 * Determine if local record is newer than server record
 */
const isLocalNewer = (localRecord, serverRecord) =>
    localRecord.updatedAt > serverRecord.updatedAt;

/**
 * Resolve conflict based on strategy
 */
const resolveConflict = (local, server, strategy = 'server') => {
    switch (strategy) {
        case 'local':
            return local;
        case 'server':
            return server;
        case 'merge':
            // Simple merge: prefer local for non-null fields
            return Object.freeze({
                ...server,
                ...Object.fromEntries(
                    Object.entries(local).filter(([_, v]) => v != null)
                ),
                updatedAt: Math.max(local.updatedAt, server.updatedAt)
            });
        default:
            return server;
    }
};

// ============================================
// Sync Manager
// ============================================

/**
 * Create sync manager for CozoDB
 * 
 * @param {Object} localDb - Local CozoDB executor
 * @param {SyncConfig} config - Sync configuration
 * @returns {Object} Sync manager
 */
const createSyncManager = (localDb, config) => {
    const { 
        serverUrl, 
        clientId = generateSyncId(),
        conflictStrategy = 'server',
        onConflict,
        onSyncStart,
        onSyncComplete,
        onSyncError
    } = config;
    
    // State
    let lastSyncTime = 0;
    let pendingQueue = [];
    let isSyncing = false;
    
    /**
     * Warn about volatility on first use
     */
    const init = () => {
        console.warn('[CozoDB Sync] ⚠️ WASM data is VOLATILE.');
        console.warn('[CozoDB Sync] Call sync() regularly to prevent data loss.');
        console.warn('[CozoDB Sync] Recommended: sync on blur, beforeunload, and periodic interval.');
        return { clientId, serverUrl };
    };
    
    /**
     * Queue a change for syncing
     */
    const queueChange = (tableName, id, data, operation = 'put') => {
        const record = createSyncRecord(id, data, clientId);
        pendingQueue.push({ tableName, operation, record });
        return record.syncId;
    };
    
    /**
     * Push local changes to server
     */
    const push = async (tableName) => {
        const url = `${serverUrl}/sync/${tableName}`;
        
        const pendingForTable = pendingQueue.filter(p => p.tableName === tableName);
        if (pendingForTable.length === 0) {
            return { pushed: 0 };
        }
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientId,
                    items: pendingForTable.map(p => p.record)
                })
            });
            
            if (!response.ok) {
                throw new Error(`Push failed: ${response.status}`);
            }
            
            const result = await response.json();
            
            // Clear pushed items from queue
            pendingQueue = pendingQueue.filter(p => p.tableName !== tableName);
            
            return { pushed: pendingForTable.length, serverResponse: result };
        } catch (e) {
            if (onSyncError) onSyncError(e);
            throw e;
        }
    };
    
    /**
     * Pull server changes to local
     */
    const pull = async (tableName, fields) => {
        const url = `${serverUrl}/sync/${tableName}?since=${lastSyncTime}&clientId=${clientId}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Pull failed: ${response.status}`);
            }
            
            const { items, serverTime } = await response.json();
            
            // Apply each item to local DB
            let applied = 0;
            for (const item of items) {
                // Check for conflict
                const localData = await getLocalRecord(tableName, item.id, fields);
                
                if (localData && isLocalNewer(localData, item)) {
                    // Conflict detected
                    if (onConflict) {
                        const resolution = await onConflict(localData, item);
                        if (resolution === 'skip') continue;
                    }
                    const resolved = resolveConflict(localData, item, conflictStrategy);
                    await applyToLocal(tableName, resolved, fields);
                } else {
                    await applyToLocal(tableName, item, fields);
                }
                applied++;
            }
            
            lastSyncTime = serverTime || Date.now() / 1000;
            return { pulled: applied };
        } catch (e) {
            if (onSyncError) onSyncError(e);
            throw e;
        }
    };
    
    /**
     * Get record from local DB
     */
    const getLocalRecord = async (tableName, id, fields) => {
        try {
            const query = `?[${fields.join(', ')}] := *${tableName}{${fields.join(', ')}}, id == $id`;
            const rows = await localDb.query(query, { id });
            if (rows.length === 0) return null;
            
            const record = {};
            fields.forEach((f, i) => { record[f] = rows[0][i]; });
            return record;
        } catch (e) {
            return null;
        }
    };
    
    /**
     * Apply server record to local DB
     */
    const applyToLocal = async (tableName, record, fields) => {
        const data = typeof record.data === 'string' 
            ? JSON.parse(record.data) 
            : record.data;
        
        const values = fields.map(f => {
            const val = data[f] ?? record[f];
            return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        });
        
        const query = `?[${fields.join(', ')}] <- [[${values.join(', ')}]]
                       :put ${tableName} {${fields.join(', ')}}`;
        
        await localDb.mutate(query);
    };
    
    /**
     * Full bidirectional sync
     */
    const sync = async (tableName, fields) => {
        if (isSyncing) {
            console.warn('[CozoDB Sync] Sync already in progress');
            return { skipped: true };
        }
        
        isSyncing = true;
        if (onSyncStart) onSyncStart();
        
        try {
            const pushResult = await push(tableName);
            const pullResult = await pull(tableName, fields);
            
            const result = {
                pushed: pushResult.pushed,
                pulled: pullResult.pulled,
                timestamp: Date.now()
            };
            
            if (onSyncComplete) onSyncComplete(result);
            return result;
        } finally {
            isSyncing = false;
        }
    };
    
    /**
     * Get sync status
     */
    const getStatus = () => Object.freeze({
        clientId,
        lastSyncTime,
        pendingCount: pendingQueue.length,
        isSyncing
    });
    
    /**
     * Setup auto-sync on page events (browser only)
     */
    const setupAutoSync = (tableName, fields, options = {}) => {
        const { intervalMs = 60000, syncOnBlur = true, syncOnUnload = true } = options;
        
        if (typeof window === 'undefined') {
            console.warn('[CozoDB Sync] Auto-sync only available in browser');
            return;
        }
        
        // Periodic sync
        const intervalId = setInterval(() => sync(tableName, fields), intervalMs);
        
        // Sync on blur
        if (syncOnBlur) {
            window.addEventListener('blur', () => sync(tableName, fields));
        }
        
        // Sync on unload
        if (syncOnUnload) {
            window.addEventListener('beforeunload', () => {
                // Use sendBeacon for reliability
                const data = JSON.stringify({
                    clientId,
                    items: pendingQueue.filter(p => p.tableName === tableName).map(p => p.record)
                });
                navigator.sendBeacon(`${serverUrl}/sync/${tableName}`, data);
            });
        }
        
        return () => clearInterval(intervalId);
    };
    
    return Object.freeze({
        init,
        queueChange,
        push,
        pull,
        sync,
        getStatus,
        setupAutoSync,
        
        // Expose pure functions for testing
        _resolveConflict: resolveConflict,
        _isLocalNewer: isLocalNewer,
        _createSyncRecord: createSyncRecord
    });
};

// ============================================
// Exports
// ============================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createSyncManager,
        createSyncRecord,
        resolveConflict,
        isLocalNewer,
        generateSyncId
    };
}

if (typeof window !== 'undefined') {
    window.CozoSyncHelper = {
        createSyncManager,
        resolveConflict
    };
}

export {
    createSyncManager,
    createSyncRecord,
    resolveConflict,
    isLocalNewer,
    generateSyncId
};
