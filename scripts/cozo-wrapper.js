/**
 * CozoDB Functional Wrapper
 * 
 * A functional, immutable-first wrapper for CozoDB operations.
 * Designed for:
 * - Pure functions with no side effects
 * - Immutable data structures
 * - Dependency injection for testability
 * - Clear separation of query building and execution
 * 
 * @module cozo-wrapper
 */

// ============================================
// Types (JSDoc for documentation)
// ============================================

/**
 * @typedef {Object} QueryResult
 * @property {boolean} ok - Whether query succeeded
 * @property {string[]} [headers] - Column names
 * @property {any[][]} [rows] - Result rows
 * @property {string} [message] - Error message if !ok
 */

/**
 * @typedef {Object} CozoConfig
 * @property {'memory'|'sqlite'|'rocksdb'|'wasm'} backend
 * @property {string} [path] - Database path for persistent backends
 * @property {Object} [options] - Backend-specific options
 */

// ============================================
// Pure Query Builders (No Side Effects)
// ============================================

/**
 * Build a CREATE relation query
 * @param {string} name - Relation name
 * @param {Object} schema - { keyFields: [...], valueFields: [...] }
 * @returns {string} Datalog query
 */
const buildCreateQuery = (name, schema) => {
    const { keyFields = [], valueFields = [] } = schema;
    
    const keyPart = keyFields
        .map(f => `${f.name}: ${f.type}${f.default ? ` default ${f.default}` : ''}`)
        .join(',\n                ');
    
    const valuePart = valueFields
        .map(f => `${f.name}: ${f.type}${f.default ? ` default ${f.default}` : ''}`)
        .join(',\n                ');
    
    return `:create ${name} {
                ${keyPart}
                =>
                ${valuePart}
            }`;
};

/**
 * Build a PUT (insert/update) query
 * @param {string} relation - Relation name
 * @param {string[]} keys - Key field names
 * @param {string[]} values - Value field names
 * @param {any[][]} data - Rows to insert
 * @returns {string} Datalog query
 */
const buildPutQuery = (relation, keys, values, data) => {
    const allFields = [...keys, ...values];
    const dataJson = JSON.stringify(data);
    
    return `?[${allFields.join(', ')}] <- ${dataJson}
            :put ${relation} {${keys.join(', ')} => ${values.join(', ')}}`;
};

/**
 * Build a SELECT query
 * @param {string} relation - Relation name
 * @param {string[]} fields - Fields to select
 * @param {Object} [options] - { filter, orderBy, limit }
 * @returns {string} Datalog query
 */
const buildSelectQuery = (relation, fields, options = {}) => {
    const { filter, orderBy, limit } = options;
    
    let query = `?[${fields.join(', ')}] := *${relation}{${fields.join(', ')}}`;
    
    if (filter) {
        query += `, ${filter}`;
    }
    
    if (orderBy) {
        query += `\n:order ${orderBy}`;
    }
    
    if (limit) {
        query += `\n:limit ${limit}`;
    }
    
    return query;
};

/**
 * Build a DELETE query
 * @param {string} relation - Relation name
 * @param {string[]} fields - All field names
 * @param {any[][]} data - Rows to delete
 * @returns {string} Datalog query
 */
const buildDeleteQuery = (relation, fields, data) => {
    const dataJson = JSON.stringify(data);
    return `?[${fields.join(', ')}] <- ${dataJson}
            :rm ${relation} {${fields.join(', ')}}`;
};

// ============================================
// Database Factory (Dependency Injection)
// ============================================

/**
 * Create a database executor with injected backend
 * This enables testing with mock backends
 * 
 * @param {Object} backend - Database instance (CozoDb or mock)
 * @param {Object} [options] - { isWasm: boolean }
 * @returns {Object} Executor with run, query, mutate methods
 */
const createExecutor = (backend, options = {}) => {
    const { isWasm = false } = options;
    
    /**
     * Execute raw Datalog query
     * @param {string} query - Datalog query
     * @param {Object} [params] - Query parameters
     * @returns {Promise<QueryResult>}
     */
    const run = async (query, params = {}) => {
        if (isWasm) {
            // WASM backend uses synchronous API with JSON string params
            const result = backend.run(query, JSON.stringify(params));
            return JSON.parse(result);
        } else {
            // Node.js backend uses async API with object params
            return backend.run(query, params);
        }
    };
    
    /**
     * Execute query and return rows (throws on error)
     * Pure function - only reads data
     */
    const query = async (queryStr, params = {}) => {
        const result = await run(queryStr, params);
        if (!result.ok) {
            throw new Error(result.message || 'Query failed');
        }
        return result.rows || [];
    };
    
    /**
     * Execute mutation (create/put/rm)
     * Explicit side effect boundary
     */
    const mutate = async (queryStr, params = {}) => {
        const result = await run(queryStr, params);
        if (!result.ok) {
            throw new Error(result.message || 'Mutation failed');
        }
        return { success: true, affected: result.rows?.length || 0 };
    };
    
    return Object.freeze({ run, query, mutate });
};

// ============================================
// Multi-Tenant Database Manager
// ============================================

/**
 * Create a multi-tenant database manager
 * Each user/tenant gets their own isolated database instance
 * 
 * @param {Function} dbFactory - Function to create CozoDb instances
 * @param {Object} [config] - { basePath, backend }
 * @returns {Object} Manager with getDb, closeDb, listTenants
 */
const createTenantManager = (dbFactory, config = {}) => {
    const { basePath = './data', backend = 'sqlite' } = config;
    
    // Immutable map of tenant -> executor (using closure for encapsulation)
    let tenants = new Map();
    
    /**
     * Get or create database for tenant
     * @param {string} tenantId - Unique tenant identifier
     * @returns {Object} Executor for this tenant
     */
    const getDb = (tenantId) => {
        if (!tenants.has(tenantId)) {
            const dbPath = `${basePath}/${tenantId}.db`;
            const instance = dbFactory(backend, dbPath);
            const executor = createExecutor(instance);
            tenants.set(tenantId, { instance, executor });
        }
        return tenants.get(tenantId).executor;
    };
    
    /**
     * Close and remove tenant database
     * @param {string} tenantId
     */
    const closeDb = (tenantId) => {
        if (tenants.has(tenantId)) {
            // Note: CozoDB doesn't have explicit close, GC handles it
            tenants.delete(tenantId);
        }
    };
    
    /**
     * List all active tenants
     * @returns {string[]} Array of tenant IDs
     */
    const listTenants = () => Array.from(tenants.keys());
    
    /**
     * Get tenant count
     * @returns {number}
     */
    const getTenantCount = () => tenants.size;
    
    return Object.freeze({ getDb, closeDb, listTenants, getTenantCount });
};

// ============================================
// Repository Pattern (Domain Layer)
// ============================================

/**
 * Create a repository for a specific relation
 * Encapsulates CRUD operations with type safety
 * 
 * @param {Object} executor - Database executor from createExecutor
 * @param {string} relationName - Name of the relation
 * @param {Object} schema - { keys: [...], values: [...] }
 * @returns {Object} Repository with find, findAll, save, remove
 */
const createRepository = (executor, relationName, schema) => {
    const { keys, values } = schema;
    const allFields = [...keys, ...values];
    
    /**
     * Find all records (optionally filtered)
     */
    const findAll = async (filter = null) => {
        const query = buildSelectQuery(relationName, allFields, { filter });
        return executor.query(query);
    };
    
    /**
     * Find by primary key(s)
     */
    const findByKey = async (keyValues) => {
        const filterParts = keys.map((k, i) => `${k} == $key_${i}`);
        const params = {};
        keys.forEach((k, i) => { params[`key_${i}`] = keyValues[i]; });
        
        const query = buildSelectQuery(relationName, allFields, { 
            filter: filterParts.join(', ') 
        });
        const rows = await executor.query(query, params);
        return rows[0] || null;
    };
    
    /**
     * Save (insert or update) a record
     */
    const save = async (record) => {
        const data = [allFields.map(f => record[f])];
        const query = buildPutQuery(relationName, keys, values, data);
        return executor.mutate(query);
    };
    
    /**
     * Save multiple records
     */
    const saveAll = async (records) => {
        const data = records.map(r => allFields.map(f => r[f]));
        const query = buildPutQuery(relationName, keys, values, data);
        return executor.mutate(query);
    };
    
    /**
     * Remove a record by key values
     */
    const remove = async (keyValues) => {
        // First find the full record
        const record = await findByKey(keyValues);
        if (!record) return { success: true, affected: 0 };
        
        const data = [allFields.map((_, i) => record[i])];
        const query = buildDeleteQuery(relationName, allFields, data);
        return executor.mutate(query);
    };
    
    return Object.freeze({ findAll, findByKey, save, saveAll, remove });
};

// ============================================
// Exports
// ============================================

// Node.js exports
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Query builders (pure)
        buildCreateQuery,
        buildPutQuery,
        buildSelectQuery,
        buildDeleteQuery,
        // Executor (DI)
        createExecutor,
        // Multi-tenant
        createTenantManager,
        // Repository pattern
        createRepository
    };
}

// Browser exports
if (typeof window !== 'undefined') {
    window.CozoWrapper = {
        buildCreateQuery,
        buildPutQuery,
        buildSelectQuery,
        buildDeleteQuery,
        createExecutor,
        createTenantManager,
        createRepository
    };
}

