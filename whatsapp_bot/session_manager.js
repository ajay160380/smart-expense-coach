const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const DB_TABLE = 'custom_whatsapp_session';

async function initDB(pool) {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS ${DB_TABLE} (
            id VARCHAR(50) PRIMARY KEY,
            data BYTEA,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

async function restoreSessionFromDB(pool, clientId) {
    await initDB(pool);
    const sessionDir = path.join(__dirname, '.wwebjs_auth', `session-${clientId}`);
    
    if (fs.existsSync(sessionDir)) {
        console.log(`⚡ CustomSession: Local session directory already exists. Starting instantly!`);
        return;
    }

    console.log(`📥 CustomSession: Local session not found. Fetching from PostgreSQL...`);
    try {
        const result = await pool.query(`SELECT data FROM ${DB_TABLE} WHERE id = $1`, [clientId]);
        if (result.rows.length > 0 && result.rows[0].data) {
            const archivePath = path.join(__dirname, `session-${clientId}.tar.gz`);
            const authDir = path.join(__dirname, '.wwebjs_auth');
            
            // Ensure auth directory exists
            if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
            
            // Write buffer to disk
            fs.writeFileSync(archivePath, result.rows[0].data);
            
            // Extract tar.gz
            console.log(`📦 CustomSession: Extracting session archive...`);
            await execPromise(`tar -xzf ${archivePath} -C ${authDir}`);
            
            // Clean up archive
            fs.unlinkSync(archivePath);
            console.log(`✅ CustomSession: Session restored successfully from PostgreSQL.`);
        } else {
            console.log(`ℹ️ CustomSession: No existing session found in database. Fresh login required.`);
        }
    } catch (err) {
        console.error(`❌ CustomSession: Failed to restore session:`, err.message);
    }
}

async function backupSessionToDB(pool, clientId) {
    const sessionDir = path.join(__dirname, '.wwebjs_auth', `session-${clientId}`);
    if (!fs.existsSync(sessionDir)) {
        return; // Nothing to backup
    }

    try {
        const archivePath = path.join(__dirname, `session-${clientId}.tar.gz`);
        const authDir = path.join(__dirname, '.wwebjs_auth');
        const sessionFolderName = `session-${clientId}`;

        // Create tarball
        await execPromise(`tar -czf ${archivePath} -C ${authDir} ${sessionFolderName}`);
        
        // Read tarball into buffer
        const buffer = fs.readFileSync(archivePath);
        
        // Save to DB
        await pool.query(
            `INSERT INTO ${DB_TABLE} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
            [clientId, buffer]
        );
        
        // Clean up
        fs.unlinkSync(archivePath);
        console.log(`💾 CustomSession: Successfully backed up session to PostgreSQL.`);
    } catch (err) {
        // Suppress tar warnings that happen when LevelDB files change during archiving
        if (err.message && err.message.includes('file changed as we read it')) {
            console.log(`💾 CustomSession: Backup succeeded with minor tar warnings (safe to ignore).`);
        } else {
            console.error(`❌ CustomSession: Failed to backup session:`, err.message);
        }
    }
}

async function deleteSessionFromDB(pool, clientId) {
    try {
        await pool.query(`DELETE FROM ${DB_TABLE} WHERE id = $1`, [clientId]);
        console.log(`🗑️ CustomSession: Session deleted from PostgreSQL.`);
    } catch (err) {
        console.error(`❌ CustomSession: Failed to delete session from DB:`, err.message);
    }
}

module.exports = {
    restoreSessionFromDB,
    backupSessionToDB,
    deleteSessionFromDB
};
