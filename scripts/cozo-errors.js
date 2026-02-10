/**
 * CozoDB Error Handler with i18n Support
 * 
 * Provides structured error handling with error codes for easy translation.
 * Error codes are language-agnostic identifiers that can be mapped to
 * localized messages in any language.
 * 
 * @module cozo-errors
 */

/**
 * Error codes for CozoDB operations
 * Format: COZO_[CATEGORY]_[SPECIFIC_ERROR]
 * 
 * Categories:
 * - CONN: Connection/initialization errors
 * - QUERY: Query execution errors
 * - SCHEMA: Schema/relation errors
 * - DATA: Data manipulation errors
 * - SEC: Security-related errors
 */
const ErrorCodes = {
    // Connection errors
    COZO_CONN_INIT_FAILED: 'COZO_CONN_INIT_FAILED',
    COZO_CONN_WASM_LOAD_FAILED: 'COZO_CONN_WASM_LOAD_FAILED',
    COZO_CONN_BACKEND_UNAVAILABLE: 'COZO_CONN_BACKEND_UNAVAILABLE',
    
    // Query errors
    COZO_QUERY_SYNTAX_ERROR: 'COZO_QUERY_SYNTAX_ERROR',
    COZO_QUERY_EXECUTION_FAILED: 'COZO_QUERY_EXECUTION_FAILED',
    COZO_QUERY_TIMEOUT: 'COZO_QUERY_TIMEOUT',
    COZO_QUERY_INVALID_PARAMS: 'COZO_QUERY_INVALID_PARAMS',
    
    // Schema errors
    COZO_SCHEMA_RELATION_EXISTS: 'COZO_SCHEMA_RELATION_EXISTS',
    COZO_SCHEMA_RELATION_NOT_FOUND: 'COZO_SCHEMA_RELATION_NOT_FOUND',
    COZO_SCHEMA_COLUMN_MISMATCH: 'COZO_SCHEMA_COLUMN_MISMATCH',
    COZO_SCHEMA_TYPE_ERROR: 'COZO_SCHEMA_TYPE_ERROR',
    
    // Data errors
    COZO_DATA_KEY_VIOLATION: 'COZO_DATA_KEY_VIOLATION',
    COZO_DATA_CONSTRAINT_ERROR: 'COZO_DATA_CONSTRAINT_ERROR',
    COZO_DATA_NOT_FOUND: 'COZO_DATA_NOT_FOUND',
    
    // Security errors (for input validation)
    COZO_SEC_INVALID_INPUT: 'COZO_SEC_INVALID_INPUT',
    COZO_SEC_QUERY_TOO_LONG: 'COZO_SEC_QUERY_TOO_LONG',
    COZO_SEC_PARAM_INJECTION: 'COZO_SEC_PARAM_INJECTION',
    
    // Unknown
    COZO_UNKNOWN_ERROR: 'COZO_UNKNOWN_ERROR'
};

/**
 * Default English messages for error codes
 * Developers can override these with their own translations
 */
const DefaultMessages = {
    [ErrorCodes.COZO_CONN_INIT_FAILED]: 'Failed to initialize CozoDB database',
    [ErrorCodes.COZO_CONN_WASM_LOAD_FAILED]: 'Failed to load CozoDB WASM module',
    [ErrorCodes.COZO_CONN_BACKEND_UNAVAILABLE]: 'Requested storage backend is not available',
    
    [ErrorCodes.COZO_QUERY_SYNTAX_ERROR]: 'Datalog query syntax error',
    [ErrorCodes.COZO_QUERY_EXECUTION_FAILED]: 'Query execution failed',
    [ErrorCodes.COZO_QUERY_TIMEOUT]: 'Query execution timed out',
    [ErrorCodes.COZO_QUERY_INVALID_PARAMS]: 'Invalid query parameters',
    
    [ErrorCodes.COZO_SCHEMA_RELATION_EXISTS]: 'Relation already exists',
    [ErrorCodes.COZO_SCHEMA_RELATION_NOT_FOUND]: 'Relation not found',
    [ErrorCodes.COZO_SCHEMA_COLUMN_MISMATCH]: 'Column definition mismatch',
    [ErrorCodes.COZO_SCHEMA_TYPE_ERROR]: 'Data type error',
    
    [ErrorCodes.COZO_DATA_KEY_VIOLATION]: 'Primary key constraint violation',
    [ErrorCodes.COZO_DATA_CONSTRAINT_ERROR]: 'Data constraint error',
    [ErrorCodes.COZO_DATA_NOT_FOUND]: 'Data not found',
    
    [ErrorCodes.COZO_SEC_INVALID_INPUT]: 'Invalid input detected',
    [ErrorCodes.COZO_SEC_QUERY_TOO_LONG]: 'Query exceeds maximum length',
    [ErrorCodes.COZO_SEC_PARAM_INJECTION]: 'Potentially unsafe parameter detected',
    
    [ErrorCodes.COZO_UNKNOWN_ERROR]: 'An unknown error occurred'
};

/**
 * Structured error class for CozoDB operations
 */
class CozoError extends Error {
    /**
     * @param {string} code - Error code from ErrorCodes
     * @param {string} [detail] - Additional detail (original error message)
     * @param {Object} [context] - Additional context data
     */
    constructor(code, detail = '', context = {}) {
        const message = DefaultMessages[code] || code;
        super(message);
        
        this.name = 'CozoError';
        this.code = code;
        this.detail = detail;
        this.context = context;
        this.timestamp = new Date().toISOString();
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CozoError);
        }
    }
    
    /**
     * Get error as i18n-ready object
     * Developers can use this to display localized errors
     */
    toI18n() {
        return {
            code: this.code,
            defaultMessage: DefaultMessages[this.code],
            detail: this.detail,
            context: this.context,
            timestamp: this.timestamp
        };
    }
    
    /**
     * Get error as JSON string (for logging/transmission)
     */
    toJSON() {
        return JSON.stringify(this.toI18n());
    }
}

/**
 * Parse CozoDB native error and convert to structured CozoError
 * @param {Error|string|Object} nativeError - Error from CozoDB
 * @returns {CozoError}
 */
function parseNativeError(nativeError) {
    let message = '';
    
    if (typeof nativeError === 'string') {
        message = nativeError;
    } else if (nativeError?.message) {
        message = nativeError.message;
    } else if (nativeError?.ok === false) {
        message = nativeError.message || 'Query failed';
    }
    
    const lowerMessage = message.toLowerCase();
    
    // Map native error patterns to error codes
    if (lowerMessage.includes('syntax') || lowerMessage.includes('parse')) {
        return new CozoError(ErrorCodes.COZO_QUERY_SYNTAX_ERROR, message);
    }
    if (lowerMessage.includes('relation') && lowerMessage.includes('exist')) {
        if (lowerMessage.includes('already')) {
            return new CozoError(ErrorCodes.COZO_SCHEMA_RELATION_EXISTS, message);
        }
        return new CozoError(ErrorCodes.COZO_SCHEMA_RELATION_NOT_FOUND, message);
    }
    if (lowerMessage.includes('type') && (lowerMessage.includes('mismatch') || lowerMessage.includes('error'))) {
        return new CozoError(ErrorCodes.COZO_SCHEMA_TYPE_ERROR, message);
    }
    if (lowerMessage.includes('key') && lowerMessage.includes('violation')) {
        return new CozoError(ErrorCodes.COZO_DATA_KEY_VIOLATION, message);
    }
    if (lowerMessage.includes('timeout')) {
        return new CozoError(ErrorCodes.COZO_QUERY_TIMEOUT, message);
    }
    if (lowerMessage.includes('wasm') || lowerMessage.includes('memory access')) {
        return new CozoError(ErrorCodes.COZO_CONN_WASM_LOAD_FAILED, message);
    }
    if (lowerMessage.includes('invalid engine') || lowerMessage.includes('backend')) {
        return new CozoError(ErrorCodes.COZO_CONN_BACKEND_UNAVAILABLE, message);
    }
    
    return new CozoError(ErrorCodes.COZO_UNKNOWN_ERROR, message);
}

/**
 * Security validation for query inputs
 * Left-shift security: validate before execution
 */
const SecurityValidator = {
    MAX_QUERY_LENGTH: 100000,  // 100KB max query size
    
    /**
     * Validate query string
     * @param {string} query - Datalog query
     * @throws {CozoError} if validation fails
     */
    validateQuery(query) {
        if (typeof query !== 'string') {
            throw new CozoError(ErrorCodes.COZO_SEC_INVALID_INPUT, 'Query must be a string');
        }
        
        if (query.length > this.MAX_QUERY_LENGTH) {
            throw new CozoError(
                ErrorCodes.COZO_SEC_QUERY_TOO_LONG,
                `Query length ${query.length} exceeds max ${this.MAX_QUERY_LENGTH}`
            );
        }
        
        return true;
    },
    
    /**
     * Validate parameters object
     * @param {Object} params - Query parameters
     * @throws {CozoError} if validation fails
     */
    validateParams(params) {
        if (params === undefined || params === null) {
            return true;
        }
        
        if (typeof params !== 'object' || Array.isArray(params)) {
            throw new CozoError(ErrorCodes.COZO_SEC_INVALID_INPUT, 'Params must be an object');
        }
        
        // Check for prototype pollution attempts
        const suspiciousKeys = ['__proto__', 'constructor', 'prototype'];
        for (const key of Object.keys(params)) {
            if (suspiciousKeys.includes(key)) {
                throw new CozoError(
                    ErrorCodes.COZO_SEC_PARAM_INJECTION,
                    `Suspicious parameter key: ${key}`
                );
            }
        }
        
        return true;
    },
    
    /**
     * Sanitize string value for safe Datalog embedding
     * Use this when building dynamic queries (not recommended - prefer parameters)
     * @param {string} value - Value to sanitize
     * @returns {string} Sanitized value
     */
    sanitizeString(value) {
        if (typeof value !== 'string') {
            throw new CozoError(ErrorCodes.COZO_SEC_INVALID_INPUT, 'Value must be a string');
        }
        
        // Escape single quotes (Datalog string delimiter)
        return value.replace(/'/g, "''");
    }
};

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        ErrorCodes, 
        DefaultMessages, 
        CozoError, 
        parseNativeError,
        SecurityValidator 
    };
}

if (typeof window !== 'undefined') {
    window.CozoErrors = { 
        ErrorCodes, 
        DefaultMessages, 
        CozoError, 
        parseNativeError,
        SecurityValidator 
    };
}

