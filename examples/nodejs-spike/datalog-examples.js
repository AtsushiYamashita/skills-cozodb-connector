/**
 * CozoDB Node.js Spike - Datalog Examples
 * Comprehensive examples of Datalog patterns for common use cases
 */

const { CozoDb } = require('cozo-node');

async function main() {
    console.log('=== CozoDB Datalog Examples ===\n');
    
    const db = new CozoDb();  // In-memory for examples

    try {
        // ============================================
        // 1. SCHEMA DEFINITION
        // ============================================
        console.log('=== 1. Schema Definition ===\n');

        // Create relation with keys (before =>) and values (after =>)
        await db.run(`
            :create person {
                id: Int
                =>
                name: String,
                email: String,
                age: Int default 0,
                department: String default ''
            }
        `);
        console.log('✓ Created "person" relation with default values\n');

        // Create relation for graph edges
        await db.run(`
            :create follows {
                follower_id: Int,
                following_id: Int
            }
        `);
        console.log('✓ Created "follows" relation for graph edges\n');

        // ============================================
        // 2. DATA INSERTION
        // ============================================
        console.log('=== 2. Data Insertion ===\n');

        // Insert multiple rows
        await db.run(`
            ?[id, name, email, age, department] <- [
                [1, 'Alice', 'alice@corp.com', 30, 'Engineering'],
                [2, 'Bob', 'bob@corp.com', 25, 'Engineering'],
                [3, 'Charlie', 'charlie@corp.com', 35, 'Sales'],
                [4, 'Diana', 'diana@corp.com', 28, 'Marketing'],
                [5, 'Eve', 'eve@corp.com', 32, 'Engineering']
            ]
            :put person {id => name, email, age, department}
        `);
        console.log('✓ Inserted 5 people\n');

        // Insert graph edges
        await db.run(`
            ?[follower_id, following_id] <- [
                [1, 2], [1, 3],
                [2, 3], [2, 4],
                [3, 5],
                [4, 1], [4, 5],
                [5, 2]
            ]
            :put follows {follower_id, following_id}
        `);
        console.log('✓ Inserted follow relationships\n');

        // ============================================
        // 3. BASIC QUERIES
        // ============================================
        console.log('=== 3. Basic Queries ===\n');

        // Select all columns
        console.log('3.1 Select all:');
        let result = await db.run(`
            ?[id, name, email, age, department] := *person{id, name, email, age, department}
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        // Filter with conditions
        console.log('\n3.2 Filter: Engineers over 28:');
        result = await db.run(`
            ?[name, age] := *person{name, age, department},
                            department == 'Engineering',
                            age > 28
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        // ============================================
        // 4. JOINS (Automatic via shared variables)
        // ============================================
        console.log('\n=== 4. Joins ===\n');

        console.log('4.1 Who follows whom (with names):');
        result = await db.run(`
            ?[follower_name, following_name] := 
                *follows{follower_id, following_id},
                *person{id: follower_id, name: follower_name},
                *person{id: following_id, name: following_name}
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        // ============================================
        // 5. AGGREGATION
        // ============================================
        console.log('\n=== 5. Aggregation ===\n');

        console.log('5.1 Count by department:');
        result = await db.run(`
            ?[department, count(name)] := *person{name, department}
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        console.log('\n5.2 Average age by department:');
        result = await db.run(`
            ?[department, mean(age)] := *person{age, department}
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        console.log('\n5.3 Follower counts (who has most followers):');
        result = await db.run(`
            ?[name, count(follower_id)] := 
                *follows{follower_id, following_id},
                *person{id: following_id, name}
            :order -count(follower_id)
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        // ============================================
        // 6. RECURSIVE QUERIES (Graph Traversal)
        // ============================================
        console.log('\n=== 6. Recursive Queries ===\n');

        console.log('6.1 Transitive closure: Who can Alice reach?');
        result = await db.run(`
            reachable[to] := *follows{follower_id: 1, following_id: to}
            reachable[to] := reachable[mid], *follows{follower_id: mid, following_id: to}
            ?[name] := reachable[id], *person{id, name}
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        // ============================================
        // 7. ORDERING AND LIMITING
        // ============================================
        console.log('\n=== 7. Ordering & Limiting ===\n');

        console.log('7.1 Top 3 oldest:');
        result = await db.run(`
            ?[name, age] := *person{name, age}
            :order -age
            :limit 3
        `);
        console.log(JSON.stringify(result.rows, null, 2));

        // ============================================
        // 8. PARAMETERS (Prepared Statements)
        // ============================================
        console.log('\n=== 8. Parameters ===\n');

        console.log('8.1 Query with parameters:');
        result = await db.run(`
            ?[name, email] := *person{name, email, department},
                              department == $dept
        `, { dept: 'Engineering' });
        console.log(JSON.stringify(result.rows, null, 2));

        // ============================================
        // 9. UPDATE AND DELETE
        // ============================================
        console.log('\n=== 9. Update & Delete ===\n');

        // Update (put with same key replaces)
        console.log('9.1 Update Alice age to 31:');
        await db.run(`
            ?[id, name, email, age, department] <- [[1, 'Alice', 'alice@corp.com', 31, 'Engineering']]
            :put person {id => name, email, age, department}
        `);
        result = await db.run(`?[name, age] := *person{name, age}, name == 'Alice'`);
        console.log(JSON.stringify(result.rows, null, 2));

        // Delete
        console.log('\n9.2 Delete a follow relationship:');
        await db.run(`
            ?[follower_id, following_id] <- [[1, 2]]
            :rm follows {follower_id, following_id}
        `);
        result = await db.run(`
            ?[following_name] := *follows{follower_id: 1, following_id},
                                 *person{id: following_id, name: following_name}
        `);
        console.log('Alice now follows:', JSON.stringify(result.rows, null, 2));

        // ============================================
        // 10. SYSTEM COMMANDS
        // ============================================
        console.log('\n=== 10. System Commands ===\n');

        console.log('10.1 List all relations:');
        result = await db.run('::relations');
        console.log(JSON.stringify(result.rows, null, 2));

        console.log('\n10.2 Relation columns:');
        result = await db.run('::columns person');
        console.log(JSON.stringify(result.rows, null, 2));

        console.log('\n=== Datalog Examples Complete ===');

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();
