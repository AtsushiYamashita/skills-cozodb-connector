/**
 * CozoDB Node.js Spike - SQLite Backend Test
 * Tests SQLite-based persistent database operations
 */

const { CozoDb } = require('cozo-node');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'test-data.db');

async function main() {
    console.log('=== CozoDB SQLite Backend Test ===\n');
    
    try {
        // Check if database file exists (from previous run)
        const dbExists = fs.existsSync(DB_PATH);
        console.log(`Database file ${dbExists ? 'EXISTS' : 'does NOT exist'}: ${DB_PATH}\n`);

        // 1. Create SQLite-backed database instance
        console.log('1. Creating SQLite-backed database...');
        const db = new CozoDb('sqlite', DB_PATH);
        console.log('   ✓ Database instance created\n');

        // 2. Check existing relations
        console.log('2. Checking existing relations...');
        const existingRelations = await db.run('::relations');
        console.log('   Existing relations:', JSON.stringify(existingRelations, null, 2));

        // Check if 'notes' relation exists
        const hasNotes = existingRelations.rows && 
                         existingRelations.rows.some(row => row[0] === 'notes');

        if (!hasNotes) {
            // 3. Create a stored relation (table)
            console.log('\n3. Creating stored relation "notes"...');
            await db.run(`
                :create notes {
                    id: Int,
                    title: String,
                    content: String
                    =>
                    created_at: Float default now()
                }
            `);
            console.log('   ✓ Relation created\n');
        } else {
            console.log('   Relation "notes" already exists, skipping creation\n');
        }

        // 4. Insert new data (with timestamp to verify persistence)
        const timestamp = Date.now();
        const noteId = Math.floor(Math.random() * 10000);
        console.log(`4. Inserting note id=${noteId}...`);
        await db.run(`
            ?[id, title, content] <- [[${noteId}, 'Note at ${new Date().toISOString()}', 'Auto-generated content']]
            :put notes {id, title, content}
        `);
        console.log('   ✓ Note inserted\n');

        // 5. Query all notes
        console.log('5. Querying all notes...');
        const allNotes = await db.run(`
            ?[id, title, created_at] := *notes{id, title, created_at}
            :order id
        `);
        console.log('   Notes count:', allNotes.rows?.length || 0);
        if (allNotes.rows && allNotes.rows.length > 0) {
            console.log('   Last 3 notes:', JSON.stringify(allNotes.rows.slice(-3), null, 2));
        }
        console.log('   ✓ Query successful\n');

        // 6. Verify file was created/updated
        console.log('6. Verifying persistence file...');
        const stats = fs.statSync(DB_PATH);
        console.log(`   File size: ${stats.size} bytes`);
        console.log(`   Last modified: ${stats.mtime}`);
        console.log('   ✓ File verified\n');

        console.log('=== SQLite Backend Test PASSED ===');
        console.log('\nNote: Data IS persistent - will survive process restart.');
        console.log(`Run this script again to verify data persistence.`);

    } catch (error) {
        console.error('ERROR:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

main();
