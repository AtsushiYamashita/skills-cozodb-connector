/**
 * CozoDB Node.js Spike - Memory Backend Test
 * Tests in-memory (non-persistent) database operations
 */

const { CozoDb } = require('cozo-node');

async function main() {
    console.log('=== CozoDB Memory Backend Test ===\n');
    
    try {
        // 1. Create in-memory database instance
        console.log('1. Creating in-memory database...');
        const db = new CozoDb();
        console.log('   ✓ Database instance created\n');

        // 2. Create a stored relation (table)
        console.log('2. Creating stored relation "users"...');
        const createResult = await db.run(`
            :create users {
                id: Int,
                name: String,
                email: String
                =>
                age: Int default 0
            }
        `);
        console.log('   ✓ Relation created\n');

        // 3. Insert data using :put
        console.log('3. Inserting test data...');
        await db.run(`
            ?[id, name, email, age] <- [
                [1, 'Alice', 'alice@example.com', 30],
                [2, 'Bob', 'bob@example.com', 25],
                [3, 'Charlie', 'charlie@example.com', 35]
            ]
            :put users {id, name, email => age}
        `);
        console.log('   ✓ 3 records inserted\n');

        // 4. Query data
        console.log('4. Querying all users...');
        const queryResult = await db.run(`
            ?[id, name, email, age] := *users{id, name, email, age}
        `);
        console.log('   Result:', JSON.stringify(queryResult, null, 2));
        console.log('   ✓ Query successful\n');

        // 5. Query with filter
        console.log('5. Querying users over 28 years old...');
        const filterResult = await db.run(`
            ?[name, age] := *users{name, age}, age > 28
        `);
        console.log('   Result:', JSON.stringify(filterResult, null, 2));
        console.log('   ✓ Filtered query successful\n');

        // 6. Update data
        console.log('6. Updating Bob\'s age...');
        await db.run(`
            ?[id, name, email, age] <- [[2, 'Bob', 'bob@example.com', 26]]
            :put users {id, name, email => age}
        `);
        const updateCheck = await db.run(`
            ?[name, age] := *users{name, age}, name == 'Bob'
        `);
        console.log('   Result:', JSON.stringify(updateCheck, null, 2));
        console.log('   ✓ Update successful\n');

        // 7. Delete data
        console.log('7. Deleting Charlie...');
        await db.run(`
            ?[id, name, email] <- [[3, 'Charlie', 'charlie@example.com']]
            :rm users {id, name, email}
        `);
        const deleteCheck = await db.run(`
            ?[name] := *users{name}
        `);
        console.log('   Remaining users:', JSON.stringify(deleteCheck, null, 2));
        console.log('   ✓ Delete successful\n');

        // 8. List relations
        console.log('8. Listing all relations...');
        const relationsResult = await db.run('::relations');
        console.log('   Relations:', JSON.stringify(relationsResult, null, 2));
        console.log('   ✓ Relations listed\n');

        console.log('=== Memory Backend Test PASSED ===');
        console.log('\nNote: Data is NOT persistent - will be lost when process exits.');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();
