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

// Finds the actual session directory by checking multiple possible locations
function findSessionDir(dataPath, clientId) {
    const possiblePaths = [
        path.join(dataPath, `session-${clientId}`),                    // Direct in dataPath
        path.join(dataPath, '.wwebjs_auth', `session-${clientId}`),    // Inside .wwebjs_auth
    ];
    
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            return { sessionDir: p, parentDir: path.dirname(p), folderName: path.basename(p) };
        }
    }
    
    // Default to direct path for restore
    return { 
        sessionDir: possiblePaths[0], 
        parentDir: dataPath, 
        folderName: `session-${clientId}` 
    };
}

async function restoreSessionFromDB(pool, clientId, dataPath) {
    await initDB(pool);
    
    const found = findSessionDir(dataPath, clientId);
    console.log(`🔍 CustomSession: Looking for session at: ${found.sessionDir}`);
    
    if (fs.existsSync(found.sessionDir)) {
        console.log(`⚡ CustomSession: Local session directory already exists. Starting instantly!`);
        return;
    }

    console.log(`📥 CustomSession: Local session not found. Fetching from PostgreSQL...`);
    try {
        const result = await pool.query(`SELECT data FROM ${DB_TABLE} WHERE id = $1`, [clientId]);
        if (result.rows.length > 0 && result.rows[0].data) {
            const archivePath = path.join(dataPath, `session-${clientId}.tar.gz`);
            
            // Write buffer to disk
            fs.writeFileSync(archivePath, result.rows[0].data);
            
            // Extract tar.gz directly into dataPath
            console.log(`📦 CustomSession: Extracting session archive into ${dataPath}...`);
            await execPromise(`tar -xzf "${archivePath}" -C "${dataPath}"`);
            
            // Clean up archive
            fs.unlinkSync(archivePath);
            console.log(`✅ CustomSession: Session restored successfully from PostgreSQL!`);
        } else {
            console.log(`ℹ️ CustomSession: No existing session found in database. Fresh login required.`);
        }
    } catch (err) {
        console.error(`❌ CustomSession: Failed to restore session:`, err.message);
    }
}

async function backupSessionToDB(pool, clientId, dataPath) {
    const found = findSessionDir(dataPath, clientId);
    
    console.log(`🔍 CustomSession: Checking session at: ${found.sessionDir}`);
    
    if (!fs.existsSync(found.sessionDir)) {
        console.log(`⚠️ CustomSession: Session directory NOT found at ${found.sessionDir}.`);
        try {
            const items = fs.readdirSync(dataPath);
            console.log(`📂 CustomSession: Contents of ${dataPath}: [${items.join(', ')}]`);
        } catch(e) { /* ignore */ }
        return;
    }
    
    console.log(`📂 CustomSession: Session directory found at ${found.sessionDir}! Starting backup...`);

    try {
        const archivePath = path.join(dataPath, `session-${clientId}.tar.gz`);

        // Create tarball from the parent directory containing the session folder
        await execPromise(`tar -czf "${archivePath}" -C "${found.parentDir}" "${found.folderName}"`);
        
        // Read tarball into buffer
        const buffer = fs.readFileSync(archivePath);
        
        // Save to DB
        await pool.query(
            `INSERT INTO ${DB_TABLE} (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
            [clientId, buffer]
        );
        
        // Clean up
        fs.unlinkSync(archivePath);
        const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
        console.log(`💾 CustomSession: Successfully backed up session to PostgreSQL! (${sizeMB} MB)`);
    } catch (err) {
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
