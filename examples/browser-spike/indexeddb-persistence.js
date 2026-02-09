/**
 * CozoDB Browser - IndexedDB Persistence PoC
 * 
 * This module provides a workaround for CozoDB WASM's lack of native persistence.
 * It uses IndexedDB to store exported database state and restore it on page load.
 * 
 * Strategy:
 * 1. Export database state using ::relations and ::export commands
 * 2. Store exported JSON in IndexedDB
 * 3. On page load, import the stored state
 */

const DB_NAME = 'CozoDBPersistence';
const STORE_NAME = 'database_state';
const STATE_KEY = 'cozo_export';

class CozoDBPersistence {
    constructor() {
        this.indexedDB = null;
    }

    /**
     * Initialize IndexedDB connection
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, 1);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.indexedDB = request.result;
                console.log('IndexedDB initialized');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME);
                }
            };
        });
    }

    /**
     * Export all relations from CozoDB and save to IndexedDB
     * @param {CozoDb} db - CozoDB instance
     */
    async save(db) {
        try {
            // Get list of all relations
            const relationsResult = db.run('::relations');
            const parsed = JSON.parse(relationsResult);
            
            if (!parsed.ok || !parsed.rows) {
                throw new Error('Failed to get relations');
            }

            const exportData = {
                timestamp: Date.now(),
                relations: {}
            };

            // Export each relation's data
            for (const row of parsed.rows) {
                const relationName = row[0]; // First column is relation name
                
                // Skip system relations (start with _)
                if (relationName.startsWith('_')) continue;
                
                try {
                    // Get relation schema
                    const columnsResult = db.run(`::columns ${relationName}`);
                    const columns = JSON.parse(columnsResult);
                    
                    // Get all data from relation
                    const columnNames = columns.rows.map(r => r[0]).join(', ');
                    const dataResult = db.run(`?[${columnNames}] := *${relationName}{${columnNames}}`);
                    const data = JSON.parse(dataResult);
                    
                    exportData.relations[relationName] = {
                        columns: columns.rows,
                        data: data.rows
                    };
                    
                    console.log(`Exported ${relationName}: ${data.rows?.length || 0} rows`);
                } catch (e) {
                    console.warn(`Failed to export ${relationName}:`, e);
                }
            }

            // Save to IndexedDB
            await this._put(STATE_KEY, exportData);
            console.log('Database saved to IndexedDB');
            
            return exportData;
            
        } catch (error) {
            console.error('Save error:', error);
            throw error;
        }
    }

    /**
     * Load saved state from IndexedDB and import into CozoDB
     * @param {CozoDb} db - CozoDB instance
     */
    async load(db) {
        try {
            const exportData = await this._get(STATE_KEY);
            
            if (!exportData) {
                console.log('No saved state found');
                return null;
            }

            console.log(`Loading state from ${new Date(exportData.timestamp).toLocaleString()}`);

            // Recreate relations and import data
            for (const [relationName, relationData] of Object.entries(exportData.relations)) {
                try {
                    // Build column definitions from saved schema
                    // Note: This is a simplified version - full implementation would 
                    // need to handle all column types and key/value separation
                    const columnDefs = relationData.columns.map(c => `${c[0]}: ${c[1]}`).join(', ');
                    
                    // Try to create relation (may already exist)
                    try {
                        db.run(`:create ${relationName} { ${columnDefs} }`);
                        console.log(`Created relation: ${relationName}`);
                    } catch (e) {
                        // Relation might already exist
                        console.log(`Relation ${relationName} may already exist`);
                    }

                    // Import data if present
                    if (relationData.data && relationData.data.length > 0) {
                        const columnNames = relationData.columns.map(c => c[0]).join(', ');
                        const dataJson = JSON.stringify(relationData.data);
                        
                        db.run(`?[${columnNames}] <- ${dataJson}
                               :put ${relationName} {${columnNames}}`);
                        
                        console.log(`Imported ${relationData.data.length} rows to ${relationName}`);
                    }
                    
                } catch (e) {
                    console.warn(`Failed to import ${relationName}:`, e);
                }
            }

            return exportData;
            
        } catch (error) {
            console.error('Load error:', error);
            throw error;
        }
    }

    /**
     * Clear saved state from IndexedDB
     */
    async clear() {
        await this._delete(STATE_KEY);
        console.log('Saved state cleared');
    }

    /**
     * Check if there's saved state
     */
    async hasSavedState() {
        const data = await this._get(STATE_KEY);
        return data !== null;
    }

    // IndexedDB helper methods
    async _put(key, value) {
        return new Promise((resolve, reject) => {
            const tx = this.indexedDB.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(value, key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async _get(key) {
        return new Promise((resolve, reject) => {
            const tx = this.indexedDB.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async _delete(key) {
        return new Promise((resolve, reject) => {
            const tx = this.indexedDB.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(key);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.CozoDBPersistence = CozoDBPersistence;
}

export { CozoDBPersistence };
