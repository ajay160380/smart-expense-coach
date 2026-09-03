const { Pool } = require('pg');
require('dotenv').config({path: '../.env'});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    const res = await pool.query("SELECT DISTINCT session_name FROM baileys_auth");
    console.log(res.rows);
    process.exit(0);
}
check();
