/**
 * CozoDB Test Runner - Node.js
 * 
 * Automated test suite for verifying CozoDB functionality
 * across different storage backends (Memory, SQLite, RocksDB).
 * 
 * Usage: node test-runner.js [--backend=memory|sqlite|rocksdb]
 * 
 * Exit codes:
 *   0 = All tests passed
 *   1 = Some tests failed
 *   2 = Setup/configuration error
 */

const { CozoDb } = require('cozo-node');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const backendArg = args.find(a => a.startsWith('--backend='));
const backend = backendArg ? backendArg.split('=')[1] : 'memory';

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    tests: []
};

/**
 * Log test result
 */
function logTest(name, passed, error = null) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`  ${color}${status}\x1b[0m ${name}`);
    
    if (error) {
        console.log(`         Error: ${error.message || error}`);
    }
    
    results.tests.push({ name, passed, error: error?.message });
    if (passed) results.passed++;
    else results.failed++;
}

/**
 * Assert helper
 */
function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/**
 * Test suite
 */
async function runTests(db) {
    console.log('\n--- Running Test Suite ---\n');
    
    // Test 1: Create relation
    try {
        await db.run(`
            :create test_users {
                id: Int
                =>
                name: String,
                email: String
            }
        `);
        logTest('Create relation', true);
    } catch (e) {
        logTest('Create relation', false, e);
    }
    
    // Test 2: Insert data
    try {
        await db.run(`
            ?[id, name, email] <- [
                [1, 'Alice', 'alice@test.com'],
                [2, 'Bob', 'bob@test.com']
            ]
            :put test_users {id => name, email}
        `);
        logTest('Insert data', true);
    } catch (e) {
        logTest('Insert data', false, e);
    }
    
    // Test 3: Query data
    try {
        const result = await db.run(`
            ?[id, name, email] := *test_users{id, name, email}
        `);
        assert(result.rows.length === 2, `Expected 2 rows, got ${result.rows.length}`);
        logTest('Query data', true);
    } catch (e) {
        logTest('Query data', false, e);
    }
    
    // Test 4: Filter query
    try {
        const result = await db.run(`
            ?[name] := *test_users{name, id}, id == 1
        `);
        assert(result.rows.length === 1, 'Filter should return 1 row');
        assert(result.rows[0][0] === 'Alice', 'Should find Alice');
        logTest('Filter query', true);
    } catch (e) {
        logTest('Filter query', false, e);
    }
    
    // Test 5: Update data
    try {
        await db.run(`
            ?[id, name, email] <- [[1, 'Alice Updated', 'alice@test.com']]
            :put test_users {id => name, email}
        `);
        const result = await db.run(`?[name] := *test_users{name, id}, id == 1`);
        assert(result.rows[0][0] === 'Alice Updated', 'Name should be updated');
        logTest('Update data', true);
    } catch (e) {
        logTest('Update data', false, e);
    }
    
    // Test 6: Delete data
    try {
        await db.run(`
            ?[id, name, email] <- [[2, 'Bob', 'bob@test.com']]
            :rm test_users {id, name, email}
        `);
        const result = await db.run(`?[id] := *test_users{id}`);
        assert(result.rows.length === 1, 'Should have 1 row after delete');
        logTest('Delete data', true);
    } catch (e) {
        logTest('Delete data', false, e);
    }
    
    // Test 7: Parameterized query
    try {
        const result = await db.run(
            `?[name] := *test_users{name, id}, id == $target_id`,
            { target_id: 1 }
        );
        assert(result.rows.length === 1, 'Parameterized query should work');
        logTest('Parameterized query', true);
    } catch (e) {
        logTest('Parameterized query', false, e);
    }
    
    // Test 8: List relations
    try {
        const result = await db.run('::relations');
        assert(result.rows.some(r => r[0] === 'test_users'), 'Should list test_users');
        logTest('List relations (::relations)', true);
    } catch (e) {
        logTest('List relations (::relations)', false, e);
    }
    
    // Test 9: Aggregation
    try {
        await db.run(`
            ?[id, name, email] <- [[3, 'Charlie', 'charlie@test.com']]
            :put test_users {id => name, email}
        `);
        const result = await db.run(`?[count(id)] := *test_users{id}`);
        assert(result.rows[0][0] === 2, 'Count should be 2');
        logTest('Aggregation (count)', true);
    } catch (e) {
        logTest('Aggregation (count)', false, e);
    }
    
    // Test 10: Error handling (intentional syntax error)
    try {
        const result = await db.run(`INVALID QUERY SYNTAX`);
        if (!result.ok) {
            logTest('Error handling (syntax error detected)', true);
        } else {
            logTest('Error handling (syntax error detected)', false, 
                new Error('Should have returned error'));
        }
    } catch (e) {
        // Expected - error thrown
        logTest('Error handling (syntax error detected)', true);
    }
    
    // Cleanup
    try {
        await db.run(`:rm test_users {}`);
    } catch (e) {
        // Ignore cleanup errors
    }
}

/**
 * Main entry point
 */
async function main() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║     CozoDB Test Runner (Node.js)           ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\nBackend: ${backend.toUpperCase()}`);
    
    let db;
    let dbPath;
    
    try {
        // Initialize database based on backend
        switch (backend) {
            case 'memory':
                console.log('Using in-memory database');
                db = new CozoDb();
                break;
                
            case 'sqlite':
                dbPath = path.join(__dirname, 'test-runner.db');
                console.log(`Using SQLite: ${dbPath}`);
                // Clean up previous test file
                if (fs.existsSync(dbPath)) {
                    fs.unlinkSync(dbPath);
                }
                db = new CozoDb('sqlite', dbPath);
                break;
                
            case 'rocksdb':
                dbPath = path.join(__dirname, 'test-runner-rocks');
                console.log(`Using RocksDB: ${dbPath}`);
                // Clean up previous test directory
                if (fs.existsSync(dbPath)) {
                    fs.rmSync(dbPath, { recursive: true });
                }
                db = new CozoDb('rocksdb', dbPath);
                break;
                
            default:
                console.error(`Unknown backend: ${backend}`);
                console.error('Use: --backend=memory|sqlite|rocksdb');
                process.exit(2);
        }
        
        // Run tests
        await runTests(db);
        
    } catch (e) {
        console.error(`\nSetup Error: ${e.message}`);
        if (backend === 'rocksdb' && e.message.includes('Invalid engine')) {
            console.error('RocksDB backend may not be available on this system.');
            console.error('Try using --backend=sqlite instead.');
        }
        process.exit(2);
    }
    
    // Print summary
    console.log('\n--- Test Summary ---');
    console.log(`  Total:   ${results.passed + results.failed}`);
    console.log(`  \x1b[32mPassed:  ${results.passed}\x1b[0m`);
    console.log(`  \x1b[31mFailed:  ${results.failed}\x1b[0m`);
    
    // Output JSON result for CI integration
    const jsonResult = {
        backend,
        timestamp: new Date().toISOString(),
        summary: {
            total: results.passed + results.failed,
            passed: results.passed,
            failed: results.failed
        },
        tests: results.tests
    };
    
    const resultPath = path.join(__dirname, 'test-results.json');
    fs.writeFileSync(resultPath, JSON.stringify(jsonResult, null, 2));
    console.log(`\nResults saved to: ${resultPath}`);
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

main();
