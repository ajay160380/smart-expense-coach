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

async function getStartingSession() {
    try {
        const res = await pool.query("SELECT DISTINCT session_name FROM baileys_auth WHERE session_name LIKE 'baileys_session_%'");
        const existing = res.rows.map(r => parseInt(r.session_name.split('_').pop())).filter(n => !isNaN(n));
        
        for (let i = 1; i <= MAX_SESSIONS; i++) {
            // We assume if a session exists and has multiple rows (keys), it's logged in.
            // But just to be safe, we'll start from the one the user tells us, or default to 1.
        }
    } catch (e) {
        // ignore
    }
    return 1;
}

async function startSessionGeneration(sessionNumber) {
    if (sessionNumber > MAX_SESSIONS) {
        console.log('\n🎉 ALL SESSIONS GENERATED SUCCESSFULLY! 🎉');
        
        const doneHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>All Done!</title>
            <style>
                body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #e6f7ff; }
                h1 { color: #0277bd; }
                p { font-size: 20px; color: #555; }
            </style>
        </head>
        <body>
            <h1>🎉 All 4 Sessions Generated & Saved!</h1>
            <p>You can close this page now. The bot on Render will use these automatically.</p>
        </body>
        </html>
        `;
        require('fs').writeFileSync('scan_me.html', doneHtml);
        
        console.log('You can now start the bot normally (node bot.js or start.sh).');
        process.exit(0);
    }

    const sessionName = `baileys_session_${sessionNumber}`;
    console.log(`\n=========================================`);
    console.log(`🔄 Generating QR Code for Session ${sessionNumber} / ${MAX_SESSIONS}`);
    console.log(`=========================================\n`);
    
    let isProceeding = false;
    
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
            
            // Create a nice HTML file for the user to open and scan easily
            const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scan WhatsApp QR - Session ${sessionNumber}</title>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #f0f2f5; }
                    h1 { color: #128C7E; }
                    #qrcode { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
                    p { margin-top: 20px; color: #555; font-size: 18px; }
                </style>
                <!-- Auto refresh the page every 5 seconds to get new QR codes if generated -->
                <meta http-equiv="refresh" content="5">
            </head>
            <body>
                <h1>📱 Scan for Session ${sessionNumber} / ${MAX_SESSIONS}</h1>
                <div id="qrcode">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}" alt="QR Code" width="300" height="300">
                </div>
                <p>Open WhatsApp > Linked Devices > Link a Device and scan this.</p>
            </body>
            </html>
            `;
            require('fs').writeFileSync('scan_me.html', htmlContent);
            
            console.log(`\n=========================================`);
            console.log(`🌐 PLEASE OPEN THIS FILE IN YOUR BROWSER:`);
            console.log(`file:///Users/ajayvishwakarma/Desktop/expense_project/whatsapp_bot/scan_me.html`);
            console.log(`=========================================\n`);
        }

        if (connection === 'close') {
            if (isProceeding) return;
            console.log(`\n❌ Connection closed unexpectedly! Retrying session ${sessionNumber}...`);
            setTimeout(() => startSessionGeneration(sessionNumber), 3000);
        } else if (connection === 'open') {
            console.log(`\n✅ Session ${sessionNumber} (${sessionName}) successfully linked and saved!`);
            console.log(`Waiting 5 seconds before preparing next session...\n`);
            
            const successHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Success - Session ${sessionNumber}</title>
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background-color: #e6ffe6; }
                    h1 { color: #2e7d32; font-size: 40px; }
                    p { font-size: 20px; color: #555; }
                </style>
                <!-- Auto refresh to load next QR -->
                <meta http-equiv="refresh" content="5">
            </head>
            <body>
                <h1>✅ Session ${sessionNumber} Successfully Saved!</h1>
                <p>Please wait 5 seconds. The next QR code will appear automatically...</p>
            </body>
            </html>
            `;
            require('fs').writeFileSync('scan_me.html', successHtml);

            // Disconnect and proceed to the next session
            setTimeout(() => {
                isProceeding = true;
                sock.ws.close();
                startSessionGeneration(sessionNumber + 1);
            }, 5000);
        }
    });
}

// Start from session 1
const args = process.argv.slice(2);
const startAt = args.length > 0 ? parseInt(args[0]) : 1;

startSessionGeneration(startAt);
