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
            
            // Create a nice HTML file for the user to open and scan easily
            const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Scan WhatsApp QR - Session ${sessionNumber}</title>
                <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
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
                <div id="qrcode"></div>
                <p>Open WhatsApp > Linked Devices > Link a Device and scan this.</p>
                <script>
                    new QRCode(document.getElementById("qrcode"), {
                        text: "${qr}",
                        width: 300,
                        height: 300
                    });
                </script>
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
