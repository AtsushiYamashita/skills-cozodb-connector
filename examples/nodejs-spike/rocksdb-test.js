/**
 * CozoDB Node.js Spike - RocksDB Backend Test
 * Tests RocksDB-based persistent database operations
 * Note: RocksDB may require native compilation and Rust toolchain
 */

const { CozoDb } = require('cozo-node');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'rocksdb-data');

async function main() {
    console.log('=== CozoDB RocksDB Backend Test ===\n');
    
    try {
        // 1. Attempt to create RocksDB-backed database instance
        console.log('1. Attempting to create RocksDB-backed database...');
        console.log(`   Path: ${DB_PATH}`);
        
        const db = new CozoDb('rocksdb', DB_PATH);
        console.log('   ✓ RocksDB database instance created\n');

        // 2. Create a stored relation
        console.log('2. Creating stored relation "logs"...');
        await db.run(`
            :create logs {
                id: Int,
                level: String,
                message: String
                =>
                timestamp: Float default now()
            }
        `);
        console.log('   ✓ Relation created\n');

        // 3. Insert test data
        console.log('3. Inserting test logs...');
        await db.run(`
            ?[id, level, message] <- [
                [1, 'INFO', 'Application started'],
                [2, 'DEBUG', 'Processing request'],
                [3, 'WARN', 'High memory usage']
            ]
            :put logs {id, level, message}
        `);
        console.log('   ✓ 3 logs inserted\n');

        // 4. Query data
        console.log('4. Querying all logs...');
        const result = await db.run(`
            ?[id, level, message, timestamp] := *logs{id, level, message, timestamp}
            :order id
        `);
        console.log('   Result:', JSON.stringify(result, null, 2));

        // 5. Verify directory was created
        console.log('\n5. Verifying RocksDB directory...');
        if (fs.existsSync(DB_PATH)) {
            const files = fs.readdirSync(DB_PATH);
            console.log(`   Directory exists with ${files.length} files`);
            console.log('   ✓ RocksDB storage verified\n');
        }

        console.log('=== RocksDB Backend Test PASSED ===');
        console.log('\nNote: RocksDB provides high-performance persistent storage.');

    } catch (error) {
        console.error('ERROR:', error.message);
        
        if (error.message.includes('rocksdb') || 
            error.message.includes('RocksDB') ||
            error.message.includes('Invalid engine')) {
            console.log('\n--- RocksDB Backend Analysis ---');
            console.log('RocksDB backend may not be available.');
            console.log('Possible reasons:');
            console.log('  1. cozo-node was built without RocksDB support');
            console.log('  2. Native compilation failed during npm install');
            console.log('  3. Missing Rust toolchain or C++ build tools');
            console.log('\nRecommendation: Use SQLite backend for persistence.');
        }
        
        process.exit(1);
    }
}

main();
