require('dotenv').config();
const fs = require('fs');
const { Client, RemoteAuth, MessageMedia } = require('whatsapp-web.js');
const { PostgresStore } = require('wwebjs-postgres');
const { Pool } = require('pg');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');

// We subclass RemoteAuth to prevent session deletion on casual disconnects/restarts.
class SafeRemoteAuth extends RemoteAuth {
    constructor(options) {
        super(options);
        this.isLoggingOut = false;
    }

    async logout() {
        this.isLoggingOut = true;
        await super.logout();
    }

    async disconnect() {
        if (this.isLoggingOut) {
            console.log("🔒 SafeRemoteAuth: Explicit logout detected. Deleting remote session...");
            await this.deleteRemoteSession();
            let pathExists = await this.isValidPath(this.userDataDir);
            if (pathExists) {
                await fs.promises
                    .rm(this.userDataDir, {
                        recursive: true,
                        force: true,
                        maxRetries: this.rmMaxRetries,
                    })
                    .catch(() => { });
            }
        } else {
            console.log("⚠️ SafeRemoteAuth: Casual disconnect detected. Preserving remote and local session files.");
        }
        clearInterval(this.backupSync);
    }

    async storeRemoteSession(options) {
        try {
            await super.storeRemoteSession(options);
        } catch (err) {
            console.error("❌ Failed to store remote session (ignoring to prevent crash):", err.message);
        }
    }

    async copyByRequiredDirs(from, to) {
        const path = require('path');
        for (const d of this.requiredDirs) {
            const src = path.join(from, d);
            if (await this.isValidPath(src)) {
                const dest = path.join(to, path.basename(src));
                // Using a safe manual copy strategy to avoid Node 20's ENOENT bug with fs.cp
                await this.safeCopyDir(src, dest);
            }
        }
    }

    async safeCopyDir(src, dest) {
        const path = require('path');
        await fs.promises.mkdir(dest, { recursive: true });
        const entries = await fs.promises.readdir(src, { withFileTypes: true });
        for (const entry of entries) {
            const srcPath = path.join(src, entry.name);
            const destPath = path.join(dest, entry.name);
            if (entry.isDirectory()) {
                await this.safeCopyDir(srcPath, destPath);
            } else {
                try {
                    await fs.promises.copyFile(srcPath, destPath);
                } catch (e) {
                    if (e.code !== 'ENOENT') throw e; // Ignore ENOENT (e.g. temporary leveldb locks deleted while copying)
                }
            }
        }
    }
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,                // Only 2 connections — Supabase free tier is limited to 15 total
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
});

async function startBot(retryCount = 0) {
    const MAX_RETRIES = 5;
    const BACKOFF_MS = Math.min(5000 * Math.pow(2, retryCount), 60000); // 5s, 10s, 20s, 40s, 60s

    try {
        await pool.connect();
        console.log("Connected to PostgreSQL for WhatsApp session storage.");
    } catch (err) {
        console.error(`Failed to connect to PostgreSQL (attempt ${retryCount + 1}/${MAX_RETRIES}):`, err.message);
        if (retryCount < MAX_RETRIES - 1) {
            console.log(`⏳ Retrying in ${BACKOFF_MS / 1000}s...`);
            await new Promise(r => setTimeout(r, BACKOFF_MS));
            return startBot(retryCount + 1);
        }
        console.error('❌ Max retries reached. Exiting gracefully (will not crash-loop).');
        try { await pool.end(); } catch (_) { }
        process.exit(0); // Exit 0 so supervisord doesn't immediately restart
    }

    const store = new PostgresStore({ pool });

    console.log("Starting WhatsApp Bot with SafeRemoteAuth...");

    const client = new Client({
        authStrategy: new SafeRemoteAuth({
            store: store,
            backupSyncIntervalMs: 60000, // Backup every 1 minute
            clientId: "paisa-mitra-v3", // Same clientId as before
            dataPath: './'
        }),
        puppeteer: {
            timeout: 120000, // Increase navigation timeout to 120s
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-ipv6', // Bypass potential IPv6 issues
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

    let isCronScheduled = false;

    client.on('ready', () => {
        console.log('WhatsApp Bot is ready and connected!');

        if (!isCronScheduled) {
            isCronScheduled = true;
            console.log('📅 Scheduling cron jobs...');

            // ── 💡 DAILY TIP CRON JOB (8:00 AM IST) ──
            cron.schedule('0 8 * * *', async () => {
                console.log('⏰ Running daily tip cron job (8 AM)...');
                const SPACE_URL = process.env.SPACE_URL || "http://127.0.0.1:8000";
                const DAILY_TIP_SECRET = process.env.DAILY_TIP_SECRET || "paisamitra-daily-2025";

                try {
                    const response = await fetch(`${SPACE_URL}/api/trigger-daily-tips/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ secret: DAILY_TIP_SECRET, type: 'morning' })
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

                                try {
                                    await client.sendMessage(chatId, tip.message);
                                    console.log(`✅ Daily tip sent to ${tip.whatsapp_number}`);
                                } catch (sendErr) {
                                    console.warn(`⚠️ Failed to send tip to ${chatId}: ${sendErr.message}`);
                                    if (!tip.whatsapp_number.includes('@')) {
                                        console.log(`🔄 Trying @lid fallback for ${tip.whatsapp_number}...`);
                                        const fallbackChatId = `${tip.whatsapp_number}@lid`;
                                        await client.sendMessage(fallbackChatId, tip.message);
                                        console.log(`✅ Daily tip sent via fallback to ${fallbackChatId}`);
                                    } else {
                                        throw sendErr;
                                    }
                                }

                                // Small delay between messages to avoid rate limiting
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            } catch (err) {
                                console.error(`❌ Failed to send tip to ${tip.whatsapp_number}:`, err.message);
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

            // ── 🌙 NIGHT TIP CRON JOB (10:00 PM IST) ──
            cron.schedule('0 22 * * *', async () => {
                console.log('⏰ Running night tip cron job (10 PM)...');
                const SPACE_URL = process.env.SPACE_URL || "http://127.0.0.1:8000";
                const DAILY_TIP_SECRET = process.env.DAILY_TIP_SECRET || "paisamitra-daily-2025";

                try {
                    const response = await fetch(`${SPACE_URL}/api/trigger-daily-tips/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ secret: DAILY_TIP_SECRET, type: 'night' })
                    });
                    const data = await response.json();

                    if (data.tips && data.tips.length > 0) {
                        console.log(`🌙 Sending ${data.tips.length} night tips...`);

                        for (const tip of data.tips) {
                            try {
                                const chatId = tip.whatsapp_number.includes('@')
                                    ? tip.whatsapp_number
                                    : `${tip.whatsapp_number}@c.us`;

                                try {
                                    await client.sendMessage(chatId, tip.message);
                                    console.log(`✅ Night tip sent to ${tip.whatsapp_number}`);
                                } catch (sendErr) {
                                    console.warn(`⚠️ Failed to send night tip to ${chatId}: ${sendErr.message}`);
                                    if (!tip.whatsapp_number.includes('@')) {
                                        console.log(`🔄 Trying @lid fallback for ${tip.whatsapp_number}...`);
                                        const fallbackChatId = `${tip.whatsapp_number}@lid`;
                                        await client.sendMessage(fallbackChatId, tip.message);
                                        console.log(`✅ Night tip sent via fallback to ${fallbackChatId}`);
                                    } else {
                                        throw sendErr;
                                    }
                                }

                                await new Promise(resolve => setTimeout(resolve, 2000));
                            } catch (err) {
                                console.error(`❌ Failed to send night tip to ${tip.whatsapp_number}:`, err.message);
                            }
                        }
                        console.log(`🌙 Night tips batch complete! Sent: ${data.count}`);
                    } else {
                        console.log('🌙 No night tips to send today.');
                    }
                } catch (err) {
                    console.error('❌ Night tip cron failed:', err.message);
                }
            }, {
                timezone: "Asia/Kolkata"
            });
            console.log('📅 Night tip cron scheduled for 10:00 PM IST');
        } // End of isCronScheduled check
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

    client.on('disconnected', async (reason) => {
        console.log('⚠️ WhatsApp Client was logged out / disconnected!');
        console.log('Reason:', reason);

        if (reason === 'LOGOUT') {
            console.log('🗑️ WhatsApp invalidated the session. Clearing invalid session from PostgreSQL...');
            try {
                if (client.authStrategy && client.authStrategy.sessionName) {
                    await store.delete({ session: client.authStrategy.sessionName });
                    console.log('✅ Invalid session cleared successfully. Bot will ask for a fresh QR code scan upon restart.');
                }
            } catch (err) {
                console.error('❌ Failed to clear invalid session from DB:', err.message);
            }
        }

        console.log('🔄 Exiting process to allow supervisord / container manager to restart it clean...');
        process.exit(1);
    });

    // ── Helper: Safe reply with fallback ──────────────────────────────────
    // WhatsApp LID (Local ID) format mein msg.reply() fail ho sakta hai
    // Isliye pehle reply try karo, fail ho toh client.sendMessage() use karo
    async function safeReply(msg, text) {
        try {
            await msg.reply(text);
        } catch (replyErr) {
            console.warn('⚠️ msg.reply() failed, trying client.sendMessage():', replyErr.message);
            try {
                // Fallback: Direct send via chat ID
                const chat = await msg.getChat();
                await client.sendMessage(chat.id._serialized, text);
            } catch (sendErr) {
                console.error('❌ Both reply methods failed:', sendErr.message);
            }
        }
    }

    client.on('message', async (msg) => {
        const SPACE_URL = process.env.SPACE_URL || "http://127.0.0.1:7860";

        // Skip group messages, status updates, and media-only messages
        if (msg.from === 'status@broadcast') return;
        if (!msg.body || msg.body.trim() === '') return;
        if (msg.from.includes('@g.us')) {
            // Group messages mein bot respond nahi karega — sirf private chats
            return;
        }

        let phone = msg.from.split('@')[0]; // Default fallback

        try {
            // WhatsApp ke naye privacy features mein msg.from kabhi kabhi @lid (Local ID) bhejta hai
            // Isliye hum contact fetch karke uska actual number nikalenge
            const contact = await msg.getContact();
            if (contact.number) {
                phone = contact.number;
            }
        } catch (contactErr) {
            console.warn('⚠️ Could not fetch contact, using raw from:', contactErr.message);
        }

        const text = msg.body;
        console.log(`📩 Received message from ${phone} (Original ID: ${msg.from}): ${text}`);

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            let response;
            try {
                response = await fetch(`${SPACE_URL}/api/voice-expense/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone, text }),
                    signal: controller.signal
                });
            } catch (fetchErr) {
                // If it fails (e.g. connection refused on port 7860 locally), try port 8000
                if (SPACE_URL.includes("7860") && (fetchErr.code === 'ECONNREFUSED' || fetchErr.message.includes('fetch failed') || fetchErr.message.includes('connect ECONNREFUSED'))) {
                    console.log("⚠️ Failed to connect to SPACE_URL, trying local fallback on port 8000...");
                    const localUrl = SPACE_URL.replace("7860", "8000");
                    response = await fetch(`${localUrl}/api/voice-expense/`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ phone, text }),
                        signal: controller.signal
                    });
                } else {
                    throw fetchErr;
                }
            }
            clearTimeout(timeout);

            const data = await response.json();
            console.log(`📤 Django response status=${response.status}:`, JSON.stringify(data).substring(0, 200));

            // Priority 0: Media Attachment (e.g. Reports)
            if (data.media) {
                const media = new MessageMedia(data.media.mimetype, data.media.base64, data.media.filename);
                const chat = await msg.getChat();
                await client.sendMessage(chat.id._serialized, media, { caption: data.message || "Here is your file." });
            }
            // Priority 1: Direct message field (covers both success and error cases)
            else if (data.message) {
                await safeReply(msg, data.message);
            }
            // Priority 2: Chat response from AI (legacy field)
            else if (data.chat_response) {
                await safeReply(msg, data.chat_response);
            }
            // Priority 3: Expense object fallback
            else if (data.expense) {
                await safeReply(msg, `✅ Kharcha Add Ho Gaya!\n\n💰 Amount: ₹${data.expense.amount}\n📂 Category: ${data.expense.category}\n📝 Note: ${data.expense.description}`);
            }
            // Priority 4: Unknown response
            else if (data.error) {
                await safeReply(msg, `❌ ${data.error}`);
            }
            else {
                console.warn('⚠️ Unexpected response format:', JSON.stringify(data));
                await safeReply(msg, "Thoda confusion ho gaya. Pura detail batao, kya aur kitne ka liya?");
            }
        } catch (err) {
            console.error('❌ Error processing message:', err.message);
            // Send error message back to user so they know something went wrong
            try {
                if (err.name === 'AbortError') {
                    await safeReply(msg, '⏰ Server response slow hai. Thoda wait karo aur phir try karo!');
                } else {
                    await safeReply(msg, '😅 Technical issue aa gayi. Thoda baad mein try karo!');
                }
            } catch (_) {
                // Last resort - can't even send error message
                console.error('❌ Could not send error message to user');
            }
        }
    });

    // Graceful shutdown handlers for Hugging Face Spaces / Docker
    const gracefulShutdown = async () => {
        console.log('Shutting down gracefully...');
        try {
            await client.destroy();
            console.log('Client destroyed. Closing pg pool...');
            try { await pool.end(); } catch (_) { }
            process.exit(0);
        } catch (err) {
            console.error('Error during shutdown:', err);
            try { await pool.end(); } catch (_) { }
            process.exit(1);
        }
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);

    client.initialize().catch(err => {
        console.error('❌ Client initialization failed:', err.message);
        console.log('🔄 Restarting bot due to initialization failure...');
        setTimeout(() => process.exit(1), 2000);
    });
    
    // ── Internal HTTP API for Django to send OTPs via WhatsApp ──
    const http = require('http');
    const server = http.createServer(async (req, res) => {
        if (req.method === 'POST' && req.url === '/api/send-message') {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const data = JSON.parse(body);
                    const phone_val = data.phone_number || data.phone || '';
                    const message = data.message;
                    
                    // Format number for WhatsApp
                    let cleanPhone = phone_val.replace(/[^0-9]/g, '');
                    if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone; // Default to India if just 10 digits
                    
                    const chatId = `${cleanPhone}@c.us`;
                    
                    try {
                        const numberId = await client.getNumberId(cleanPhone);
                        if (numberId) {
                            const res = await client.sendMessage(numberId._serialized, message);
                            console.log(`✅ Sent WhatsApp message (OTP) to ${cleanPhone} via numberId. Msg ID:`, res.id._serialized);
                        } else {
                            const res = await client.sendMessage(`${cleanPhone}@c.us`, message);
                            console.log(`✅ Sent WhatsApp message (OTP) to ${cleanPhone} via @c.us. Msg ID:`, res.id._serialized);
                        }
                    } catch (e) {
                        console.log(`🔄 Trying fallback @lid for OTP to ${cleanPhone}`);
                        await client.sendMessage(`${cleanPhone}@lid`, message);
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (err) {
                    console.error('❌ Failed to send WhatsApp message via API:', err.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: err.message }));
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    server.listen(3001, () => {
        console.log('🌐 Internal Bot API listening on port 3001');
    });
}

startBot();
