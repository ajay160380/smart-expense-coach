require('dotenv').config({path: '../.env'});
const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Pool } = require('pg');
const qrcode = require('qrcode-terminal');
const usePostgresAuthState = require('./postgresAuthState');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const MAX_SESSIONS = 4;

async function startSessionGeneration(sessionNumber) {
    if (sessionNumber > MAX_SESSIONS) {
        console.log('\n🎉 ALL SESSIONS GENERATED SUCCESSFULLY! 🎉');
        console.log('You can now start the bot normally (node bot.js or start.sh).');
        process.exit(0);
    }

    const sessionName = `baileys_session_${sessionNumber}`;
    console.log(`\n=========================================`);
    console.log(`🔄 Generating QR Code for Session ${sessionNumber} / ${MAX_SESSIONS}`);
    console.log(`=========================================\n`);
    
    const { state, saveCreds } = await usePostgresAuthState(pool, sessionName);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }),
        browser: ['Expense Tracker Bot', 'Chrome', '3.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log(`\n📌 SCAN THIS QR CODE FOR SESSION ${sessionNumber} 📌\n`);
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                console.log('Reconnecting...');
                startSessionGeneration(sessionNumber);
            } else {
                console.log('Logged out. Restarting generation...');
                startSessionGeneration(sessionNumber);
            }
        } else if (connection === 'open') {
            console.log(`\n✅ Session ${sessionNumber} (${sessionName}) successfully linked and saved!`);
            console.log(`Waiting 5 seconds before preparing next session...\n`);
            
            // Disconnect and proceed to the next session
            setTimeout(() => {
                sock.ws.close();
                startSessionGeneration(sessionNumber + 1);
            }, 5000);
        }
    });
}

// Start from session 1
startSessionGeneration(1);
