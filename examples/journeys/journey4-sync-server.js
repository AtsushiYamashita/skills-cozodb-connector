/**
 * User Journey 4: PWA + Node.js Hybrid Architecture
 * 
 * Scenario: Offline-first application with sync
 * - PWA runs CozoDB WASM for offline capability
 * - Node.js server runs CozoDB for authoritative storage
 * - Sync mechanism between the two
 * 
 * This file demonstrates the Node.js server side.
 * See journey4-pwa-client.html for the PWA side.
 * 
 * Features demonstrated:
 * - Sync protocol design
 * - Conflict resolution
 * - REST API for sync
 */

const { CozoDb } = require('cozo-node');
const path = require('path');
const http = require('http');
const url = require('url');

// ============================================
// Configuration
// ============================================

const config = Object.freeze({
    port: 3458,
    dbPath: path.join(__dirname, 'journey4-server.db')
});

// ============================================
// Database Layer
// ============================================

const db = new CozoDb('sqlite', config.dbPath);

const runQuery = async (query, params = {}) => {
    const result = await db.run(query, params);
    if (!result.ok) throw new Error(result.message);
    return result.rows || [];
};

const initSchema = async () => {
    try {
        await runQuery(`
            :create sync_items {
                id: String,
                client_id: String
                =>
                data: String,
                updated_at: Float,
                deleted: Int default 0
            }
        `);
        console.log('[DB] Created sync_items relation');
    } catch (e) {
        console.log('[DB] sync_items exists');
    }
};

// ============================================
// Sync Logic (Pure Functions)
// ============================================

/**
 * Merge client changes with server state
 * Returns items that need to be sent back to client
 */
const mergeChanges = (serverItems, clientItems) => {
    const serverMap = new Map(serverItems.map(item => [item.id, item]));
    const conflictsToResolve = [];
    const updatesToApply = [];
    const itemsForClient = [];
    
    for (const clientItem of clientItems) {
        const serverItem = serverMap.get(clientItem.id);
        
        if (!serverItem) {
            // New item from client
            updatesToApply.push(clientItem);
        } else if (clientItem.updated_at > serverItem.updated_at) {
            // Client is newer
            updatesToApply.push(clientItem);
        } else if (serverItem.updated_at > clientItem.updated_at) {
            // Server is newer - client needs update
            itemsForClient.push(serverItem);
        }
        // If equal, no action needed
    }
    
    // Add server items that client doesn't have
    for (const serverItem of serverItems) {
        const clientHas = clientItems.some(c => c.id === serverItem.id);
        if (!clientHas) {
            itemsForClient.push(serverItem);
        }
    }
    
    return { updatesToApply, itemsForClient };
};

/**
 * Transform row to item object
 */
const rowToItem = ([id, client_id, data, updated_at, deleted]) => ({
    id, client_id, data, updated_at, deleted
});

// ============================================
// Sync API Handlers
// ============================================

const handlers = {
    /**
     * POST /sync
     * Request: { clientId, lastSync, items: [...] }
     * Response: { serverTime, items: [...] }
     */
    async sync(clientId, lastSync, clientItems) {
        // Get server items updated since lastSync
        const serverRows = await runQuery(`
            ?[id, client_id, data, updated_at, deleted] := 
                *sync_items{id, client_id, data, updated_at, deleted},
                updated_at >= $lastSync
        `, { lastSync: lastSync || 0 });
        
        const serverItems = serverRows.map(rowToItem);
        
        // Merge changes
        const { updatesToApply, itemsForClient } = mergeChanges(serverItems, clientItems);
        
        // Apply client updates to server
        for (const item of updatesToApply) {
            await runQuery(`
                ?[id, client_id, data, updated_at, deleted] <- [[
                    '${item.id}', 
                    '${clientId}', 
                    '${item.data.replace(/'/g, "''")}', 
                    ${item.updated_at}, 
                    ${item.deleted || 0}
                ]]
                :put sync_items {id, client_id => data, updated_at, deleted}
            `);
        }
        
        return {
            serverTime: Date.now() / 1000,
            items: itemsForClient
        };
    },
    
    /**
     * GET /items
     * Get all items (for initial sync)
     */
    async getAllItems() {
        const rows = await runQuery(`
            ?[id, client_id, data, updated_at, deleted] := 
                *sync_items{id, client_id, data, updated_at, deleted},
                deleted == 0
        `);
        return rows.map(rowToItem);
    }
};

// ============================================
// HTTP Server
// ============================================

const server = http.createServer(async (req, res) => {
    // CORS headers for PWA
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    const parsedUrl = url.parse(req.url, true);
    
    try {
        if (req.method === 'POST' && parsedUrl.pathname === '/sync') {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', async () => {
                try {
                    const { clientId, lastSync, items } = JSON.parse(body);
                    const result = await handlers.sync(clientId, lastSync, items || []);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: e.message }));
                }
            });
            return;
        }
        
        if (req.method === 'GET' && parsedUrl.pathname === '/items') {
            const items = await handlers.getAllItems();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ items }));
            return;
        }
        
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        
    } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
    }
});

// ============================================
// Startup
// ============================================

async function main() {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║  User Journey 4: PWA + Node.js Sync Server     ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    await initSchema();
    
    server.listen(config.port, () => {
        console.log(`[Server] Running on http://localhost:${config.port}`);
        console.log('[Server] Endpoints:');
        console.log('  POST /sync - Sync items with client');
        console.log('  GET /items - Get all items');
        console.log('\nPress Ctrl+C to stop\n');
    });
}

main().catch(console.error);
