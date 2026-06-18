require('dotenv').config();
const { Client, RemoteAuth } = require('whatsapp-web.js');
const { PostgresStore } = require('wwebjs-postgres');
const { Pool } = require('pg');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.connect().then(() => {
    console.log("Connected to PostgreSQL for WhatsApp session storage.");
    const store = new PostgresStore({ pool });

    const client = new Client({
        authStrategy: new RemoteAuth({
            store: store,
            backupSyncIntervalMs: 60000, // Backup every 1 minute instead of 5 minutes to prevent loss
            clientId: "paisa-mitra-v3", // Fresh session ID so it gets saved properly
            dataPath: './'
        }),
        puppeteer: {
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
            ]
        }
    });

    client.on('qr', (qr) => {
        console.log('SCAN THIS QR CODE WITH WHATSAPP:');
        qrcode.generate(qr, { small: true });
        console.log('\n--- OR CLICK THIS LINK TO SEE A PERFECT QR CODE IMAGE ---');
        console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`);
    });

    client.on('ready', () => {
        console.log('WhatsApp Bot is ready and connected!');

        // ── 💡 DAILY TIP CRON JOB (8:00 AM IST = 2:30 AM UTC) ──
        cron.schedule('30 2 * * *', async () => {
            console.log('⏰ Running daily tip cron job...');
            const SPACE_URL = process.env.SPACE_URL || "http://127.0.0.1:7860";
            const DAILY_TIP_SECRET = process.env.DAILY_TIP_SECRET || "paisamitra-daily-2025";
            
            try {
                const response = await fetch(`${SPACE_URL}/api/trigger-daily-tips/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: DAILY_TIP_SECRET })
                });
                const data = await response.json();
                
                if (data.tips && data.tips.length > 0) {
                    console.log(`💡 Sending ${data.tips.length} daily tips...`);
                    
                    for (const tip of data.tips) {
                        try {
                            // Try sending to the WhatsApp number
                            const chatId = tip.whatsapp_number.includes('@') 
                                ? tip.whatsapp_number 
                                : `${tip.whatsapp_number}@c.us`;
                            
                            await client.sendMessage(chatId, tip.message);
                            console.log(`✅ Daily tip sent to ${tip.whatsapp_number}`);
                            
                            // Small delay between messages to avoid rate limiting
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        } catch (sendErr) {
                            console.error(`❌ Failed to send tip to ${tip.whatsapp_number}:`, sendErr.message);
                        }
                    }
                    console.log(`💡 Daily tips batch complete! Sent: ${data.count}`);
                } else {
                    console.log('💡 No tips to send today (all already sent or no linked users).');
                }
            } catch (err) {
                console.error('❌ Daily tip cron failed:', err.message);
            }
        }, {
            timezone: "Asia/Kolkata"
        });
        console.log('📅 Daily tip cron scheduled for 8:00 AM IST');
    });

    client.on('remote_session_saved', () => {
        console.log('✅ WhatsApp Session successfully saved to PostgreSQL!');
    });

    client.on('authenticated', () => {
        console.log('✅ Authenticated successfully!');
    });

    client.on('auth_failure', msg => {
        console.error('❌ Authentication failure:', msg);
    });

    client.on('disconnected', (reason) => {
        console.log('⚠️ WhatsApp Client was logged out / disconnected!');
        console.log('Reason:', reason);
        // Sometimes you need to destroy and reinitialize or clear the DB
    });

    client.on('message', async (msg) => {
        const SPACE_URL = process.env.SPACE_URL || "http://127.0.0.1:7860";
        
        // WhatsApp ke naye privacy features mein msg.from kabhi kabhi @lid (Local ID) bhejta hai
        // Isliye hum contact fetch karke uska actual number nikalenge
        const contact = await msg.getContact();
        const phone = contact.number || msg.from.split('@')[0];
        
        const text = msg.body;
        console.log(`Received message from ${phone} (Original ID: ${msg.from}): ${text}`);
        
        try {
            const response = await fetch(`${SPACE_URL}/api/voice-expense/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, text })
            });
            const data = await response.json();
            
            if (data.chat_response) {
                msg.reply(data.chat_response);
            } else if (data.status === 'success') {
                if (data.message) {
                    msg.reply(data.message);
                } else if (data.expense) {
                    msg.reply(`✅ Kharcha Add Ho Gaya!\n\n💰 Amount: ₹${data.expense.amount}\n📂 Category: ${data.expense.category}\n📝 Note: ${data.expense.description}\n\nBalance/Insight aap dashboard pe dekh sakte hain!`);
                } else {
                    msg.reply("✅ Action successful!");
                }
            } else if (data.status === 'error' && data.message) {
                msg.reply(data.message);
            } else {
                msg.reply("Thoda confusion ho gaya. Pura detail batao, kya aur kitne ka liya?");
            }
        } catch (err) {
            console.log("Error sending to Django:", err);
        }
    });

    // Graceful shutdown handlers for Hugging Face Spaces / Docker
    const gracefulShutdown = async () => {
        console.log('Shutting down gracefully...');
        try {
            await client.destroy();
            console.log('Client destroyed. Exiting...');
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    client.initialize();
}).catch(err => {
    console.error("Failed to connect to PostgreSQL:", err);
});
