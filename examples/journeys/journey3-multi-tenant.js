/**
 * User Journey 3: Multi-Tenant Node.js Application
 * 
 * Scenario: SaaS application where each user/organization
 * has their own isolated database instance
 * 
 * Features demonstrated:
 * - User-specific database instances (not just parameters)
 * - Tenant isolation
 * - Dynamic database creation
 * - Clean shutdown
 */

const { CozoDb } = require('cozo-node');
const path = require('path');
const fs = require('fs');
const { 
    createExecutor, 
    createTenantManager,
    buildCreateQuery 
} = require('../../scripts/cozo-wrapper');

// ============================================
// Configuration
// ============================================

const config = Object.freeze({
    dataDir: path.join(__dirname, 'tenant-data'),
    backend: 'sqlite'  // Each tenant gets their own SQLite file
});

// ============================================
// Tenant-Aware Database Factory
// ============================================

/**
 * Factory function for creating tenant databases
 * Injected into TenantManager for testability
 */
const createTenantDb = (backend, dbPath) => {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    return new CozoDb(backend, dbPath);
};

// ============================================
// Tenant Service (Business Logic)
// ============================================

/**
 * Create tenant service with isolated database per tenant
 */
const createTenantService = () => {
    const manager = createTenantManager(createTenantDb, {
        basePath: config.dataDir,
        backend: config.backend
    });
    
    // Track if schema is initialized per tenant
    const initializedTenants = new Set();
    
    /**
     * Ensure tenant schema exists
     */
    const ensureSchema = async (tenantId) => {
        if (initializedTenants.has(tenantId)) return;
        
        const db = manager.getDb(tenantId);
        
        try {
            await db.mutate(buildCreateQuery('notes', {
                keyFields: [{ name: 'id', type: 'Int' }],
                valueFields: [
                    { name: 'title', type: 'String' },
                    { name: 'content', type: 'String' },
                    { name: 'created_at', type: 'Float', default: 'now()' }
                ]
            }));
        } catch (e) {
            // Schema exists
        }
        
        initializedTenants.add(tenantId);
    };
    
    /**
     * Create a note for a tenant
     */
    const createNote = async (tenantId, note) => {
        await ensureSchema(tenantId);
        const db = manager.getDb(tenantId);
        
        const query = `
            ?[id, title, content, created_at] <- [[${note.id}, '${note.title}', '${note.content}', ${Date.now() / 1000}]]
            :put notes {id => title, content, created_at}
        `;
        
        return db.mutate(query);
    };
    
    /**
     * Get all notes for a tenant
     */
    const getNotes = async (tenantId) => {
        await ensureSchema(tenantId);
        const db = manager.getDb(tenantId);
        
        const rows = await db.query(`
            ?[id, title, content, created_at] := *notes{id, title, content, created_at}
            :order -created_at
        `);
        
        return rows.map(([id, title, content, created_at]) => ({
            id, title, content, created_at
        }));
    };
    
    /**
     * Get tenant statistics
     */
    const getStats = () => ({
        activeTenants: manager.getTenantCount(),
        tenantIds: manager.listTenants()
    });
    
    /**
     * Clean up tenant (e.g., when subscription ends)
     */
    const removeTenant = (tenantId) => {
        manager.closeDb(tenantId);
        initializedTenants.delete(tenantId);
        
        // Optionally delete the database file
        const dbPath = path.join(config.dataDir, `${tenantId}.db`);
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    };
    
    return Object.freeze({
        createNote,
        getNotes,
        getStats,
        removeTenant
    });
};

// ============================================
// Demo Runner
// ============================================

async function runDemo() {
    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log('║  User Journey 3: Multi-Tenant Node.js Application ║');
    console.log('╚══════════════════════════════════════════════════╝\n');
    
    const service = createTenantService();
    
    // Simulate multiple tenants
    const tenants = ['org_acme', 'org_globex', 'user_alice'];
    
    console.log('--- Creating Notes for Multiple Tenants ---\n');
    
    // Each tenant creates their own notes
    for (const tenantId of tenants) {
        await service.createNote(tenantId, {
            id: 1,
            title: `${tenantId}'s First Note`,
            content: `This is private to ${tenantId}`
        });
        
        await service.createNote(tenantId, {
            id: 2,
            title: `${tenantId}'s Second Note`,
            content: 'Another private note'
        });
        
        console.log(`✓ Created 2 notes for ${tenantId}`);
    }
    
    // Show tenant isolation
    console.log('\n--- Verifying Tenant Isolation ---\n');
    
    for (const tenantId of tenants) {
        const notes = await service.getNotes(tenantId);
        console.log(`${tenantId} has ${notes.length} notes:`);
        notes.forEach(n => console.log(`  - [${n.id}] ${n.title}`));
    }
    
    // Show stats
    console.log('\n--- Tenant Statistics ---\n');
    const stats = service.getStats();
    console.log(`Active tenants: ${stats.activeTenants}`);
    console.log(`Tenant IDs: ${stats.tenantIds.join(', ')}`);
    
    // List database files
    console.log('\n--- Database Files ---\n');
    const files = fs.readdirSync(config.dataDir);
    files.forEach(f => {
        const stat = fs.statSync(path.join(config.dataDir, f));
        console.log(`  ${f} (${stat.size} bytes)`);
    });
    
    // Cleanup one tenant
    console.log('\n--- Removing Tenant org_globex ---\n');
    service.removeTenant('org_globex');
    
    const afterStats = service.getStats();
    console.log(`Active tenants after removal: ${afterStats.activeTenants}`);
    
    console.log('\n✓ Journey 3 complete');
}

// Run if called directly
if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { createTenantService };
