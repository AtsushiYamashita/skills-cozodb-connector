/**
 * User Journey 1: Node.js Only Application
 * 
 * Scenario: Backend API server with CozoDB as the data store
 * - Single database instance
 * - REST API endpoints
 * - Express.js integration pattern
 * 
 * Features demonstrated:
 * - Functional wrapper usage
 * - Repository pattern
 * - Error handling with i18n codes
 */

const { CozoDb } = require('cozo-node');
const path = require('path');
const { 
    createExecutor, 
    createRepository,
    buildCreateQuery 
} = require('../../scripts/cozo-wrapper');
const { 
    parseNativeError, 
    SecurityValidator 
} = require('../../scripts/cozo-errors');

// ============================================
// Configuration (Externalized)
// ============================================

const config = Object.freeze({
    backend: process.env.COZO_BACKEND || 'sqlite',
    dbPath: process.env.COZO_DB_PATH || path.join(__dirname, 'journey1.db'),
});

// ============================================
// Database Initialization (Side Effect Boundary)
// ============================================

let db = null;
let executor = null;
let userRepo = null;

/**
 * Initialize database (call once at startup)
 * This is the only place where side effects occur
 */
async function initializeDatabase() {
    console.log(`[Init] Backend: ${config.backend}, Path: ${config.dbPath}`);
    
    // Create database instance
    db = config.backend === 'memory' 
        ? new CozoDb() 
        : new CozoDb(config.backend, config.dbPath);
    
    // Create functional executor
    executor = createExecutor(db, { isWasm: false });
    
    // Create schema if not exists
    try {
        const createQuery = buildCreateQuery('users', {
            keyFields: [{ name: 'id', type: 'Int' }],
            valueFields: [
                { name: 'username', type: 'String' },
                { name: 'email', type: 'String' },
                { name: 'created_at', type: 'Float', default: 'now()' }
            ]
        });
        await executor.mutate(createQuery);
        console.log('[Init] Created users relation');
    } catch (e) {
        // Relation may already exist
        console.log('[Init] Users relation exists');
    }
    
    // Create repository
    userRepo = createRepository(executor, 'users', {
        keys: ['id'],
        values: ['username', 'email', 'created_at']
    });
    
    console.log('[Init] Database ready');
}

// ============================================
// Business Logic (Pure Functions)
// ============================================

/**
 * Validate user data (pure function)
 */
const validateUser = (userData) => {
    const errors = [];
    
    if (!userData.id || typeof userData.id !== 'number') {
        errors.push({ code: 'INVALID_ID', field: 'id' });
    }
    
    if (!userData.username || userData.username.length < 3) {
        errors.push({ code: 'INVALID_USERNAME', field: 'username' });
    }
    
    if (!userData.email || !userData.email.includes('@')) {
        errors.push({ code: 'INVALID_EMAIL', field: 'email' });
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
};

/**
 * Transform user data for response (pure function)
 */
const transformUserForResponse = (row) => {
    if (!row) return null;
    const [id, username, email, created_at] = row;
    return Object.freeze({ id, username, email, created_at });
};

// ============================================
// API Handlers (Thin Layer - Orchestration Only)
// ============================================

/**
 * Example Express.js-style handlers
 */
const handlers = {
    async createUser(userData) {
        // Validate input
        const validation = validateUser(userData);
        if (!validation.valid) {
            return { 
                success: false, 
                error: 'VALIDATION_FAILED', 
                details: validation.errors 
            };
        }
        
        // Security check
        SecurityValidator.validateParams(userData);
        
        try {
            await userRepo.save({
                id: userData.id,
                username: userData.username,
                email: userData.email,
                created_at: Date.now() / 1000
            });
            
            return { success: true, id: userData.id };
        } catch (e) {
            const error = parseNativeError(e);
            return { 
                success: false, 
                error: error.code, 
                message: error.detail 
            };
        }
    },
    
    async getUser(id) {
        try {
            const row = await userRepo.findByKey([id]);
            const user = transformUserForResponse(row);
            
            if (!user) {
                return { success: false, error: 'USER_NOT_FOUND' };
            }
            
            return { success: true, user };
        } catch (e) {
            const error = parseNativeError(e);
            return { success: false, error: error.code };
        }
    },
    
    async listUsers() {
        try {
            const rows = await userRepo.findAll();
            const users = rows.map(transformUserForResponse);
            return { success: true, users };
        } catch (e) {
            const error = parseNativeError(e);
            return { success: false, error: error.code };
        }
    },
    
    async deleteUser(id) {
        try {
            const result = await userRepo.remove([id]);
            return { success: true, affected: result.affected };
        } catch (e) {
            const error = parseNativeError(e);
            return { success: false, error: error.code };
        }
    }
};

// ============================================
// Demo Runner
// ============================================

async function runDemo() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║  User Journey 1: Node.js Only Application  ║');
    console.log('╚════════════════════════════════════════════╝\n');
    
    await initializeDatabase();
    
    // Create users
    console.log('\n--- Creating Users ---');
    let result = await handlers.createUser({ id: 1, username: 'alice', email: 'alice@example.com' });
    console.log('Create alice:', JSON.stringify(result));
    
    result = await handlers.createUser({ id: 2, username: 'bob', email: 'bob@example.com' });
    console.log('Create bob:', JSON.stringify(result));
    
    // Validation failure
    result = await handlers.createUser({ id: 3, username: 'x', email: 'bad' });
    console.log('Create invalid:', JSON.stringify(result));
    
    // Get user
    console.log('\n--- Get User ---');
    result = await handlers.getUser(1);
    console.log('Get alice:', JSON.stringify(result));
    
    result = await handlers.getUser(999);
    console.log('Get non-existent:', JSON.stringify(result));
    
    // List users
    console.log('\n--- List Users ---');
    result = await handlers.listUsers();
    console.log('All users:', JSON.stringify(result, null, 2));
    
    // Delete user
    console.log('\n--- Delete User ---');
    result = await handlers.deleteUser(2);
    console.log('Delete bob:', JSON.stringify(result));
    
    // Final list
    console.log('\n--- Final State ---');
    result = await handlers.listUsers();
    console.log('Remaining users:', JSON.stringify(result, null, 2));
    
    console.log('\n✓ Journey 1 complete');
}

// Run if called directly
if (require.main === module) {
    runDemo().catch(console.error);
}

module.exports = { initializeDatabase, handlers };
