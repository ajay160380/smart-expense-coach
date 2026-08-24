const { initAuthCreds, BufferJSON } = require('@whiskeysockets/baileys');

module.exports = async function usePostgresAuthState(pool, sessionName = 'baileys_session') {
    // 1. Ensure table exists
    await pool.query(`
        CREATE TABLE IF NOT EXISTS baileys_auth (
            session_name VARCHAR(255),
            key_id VARCHAR(255),
            data JSONB,
            PRIMARY KEY (session_name, key_id)
        );
    `);

    // Helper functions
    const writeData = async (data, id) => {
        const jsonStr = JSON.stringify(data, BufferJSON.replacer);
        await pool.query(
            `INSERT INTO baileys_auth (session_name, key_id, data) 
             VALUES ($1, $2, $3::jsonb) 
             ON CONFLICT (session_name, key_id) DO UPDATE SET data = EXCLUDED.data`,
            [sessionName, id, jsonStr]
        );
    };

    const readData = async (id) => {
        const res = await pool.query(
            `SELECT data FROM baileys_auth WHERE session_name = $1 AND key_id = $2`,
            [sessionName, id]
        );
        if (res.rows.length > 0) {
            return JSON.parse(JSON.stringify(res.rows[0].data), BufferJSON.reviver);
        }
        return null;
    };

    const removeData = async (id) => {
        await pool.query(
            `DELETE FROM baileys_auth WHERE session_name = $1 AND key_id = $2`,
            [sessionName, id]
        );
    };

    const clearSession = async () => {
        await pool.query(
            `DELETE FROM baileys_auth WHERE session_name = $1`,
            [sessionName]
        );
    };

    // 2. Fetch creds
    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, 'creds');
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async id => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = require('@whiskeysockets/baileys').proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        },
        clearSession
    };
};
