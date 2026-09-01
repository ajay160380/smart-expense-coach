const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Pool } = require('pg');
const fs = require('fs');
const express = require('express');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const usePostgresAuthState = require('./postgresAuthState');

const PORT = process.env.PORT || 8000;
// Use DJANGO_URL if provided, else fallback to localhost for monolithic deployment
const INTERNAL_API_URL = process.env.DJANGO_URL || `http://127.0.0.1:${PORT}`;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const allowedAdmins = [
    "917905398965@s.whatsapp.net",
    "7905398965@s.whatsapp.net",
    "917379053923@s.whatsapp.net",
    "260391116484637@s.whatsapp.net"
];

if (process.env.MY_WHATSAPP_NUMBER) {
    allowedAdmins.push(process.env.MY_WHATSAPP_NUMBER.replace('@c.us', '@s.whatsapp.net'));
}

let currentSessionName = 'baileys_session';
let globalSock = null;

async function getNextAvailableSession(failedSessionName = null) {
    try {
        const res = await pool.query("SELECT DISTINCT session_name FROM baileys_auth WHERE session_name LIKE 'baileys_session_%' OR session_name = 'baileys_session'");
        let availableSessions = res.rows.map(r => r.session_name);
        
        if (failedSessionName) {
            availableSessions = availableSessions.filter(s => s !== failedSessionName);
        }
        
        availableSessions.sort();
        
        if (availableSessions.length > 0) {
            return availableSessions[0];
        }
    } catch (err) {
        console.error("Error fetching sessions from DB:", err);
    }
    return null;
}

async function startBot(sessionName = null) {
    if (!sessionName) {
        sessionName = await getNextAvailableSession(null) || 'baileys_session';
    }
    currentSessionName = sessionName;
    console.log(`🔄 Starting WhatsApp Bot (Baileys) with session: ${currentSessionName}...`);
    
    // Auth State from PostgreSQL
    const { state, saveCreds, clearSession } = await usePostgresAuthState(pool, currentSessionName);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }), // Silence logs for clean output
        browser: ['Expense Tracker Bot', 'Chrome', '3.0.0']
    });
    globalSock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            const nextSession = await getNextAvailableSession(currentSessionName);
            
            if (nextSession) {
                console.log(`⚠️ Session ${currentSessionName} requires login (unauthorized/empty). Deleting it and falling back...`);
                await clearSession();
                console.log(`⚠️ Falling back to next available session: ${nextSession}`);
                startBot(nextSession);
            } else {
                console.log(`\n\n🚨 CRITICAL: No valid backup sessions available!`);
                console.log(`📌 SCAN THIS QR CODE WITH WHATSAPP TO LOGIN 📌\n`);
                console.log('Agar upar wala QR code scan nahi ho raha, toh is RAW code ko copy karke kisi bhi QR Generator website (jaise the-qrcode-generator.com) par paste karein aur wahan se scan karein:');
                console.log('\n=========================================\nRAW_QR_CODE_START\n' + qr + '\nRAW_QR_CODE_END\n=========================================\n');
                
                try {
                    qrcode.generate(qr, { small: true });
                } catch (e) {
                    console.log("Could not print terminal QR, please use the RAW_QR_CODE_START string above.");
                }
            }
            return;
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Connection closed due to', lastDisconnect.error, ', reconnecting:', shouldReconnect);
            
            if (!shouldReconnect) {
                console.log(`🗑️ Logged out completely from ${currentSessionName}! Clearing session...`);
                await clearSession();
                
                const nextSession = await getNextAvailableSession(currentSessionName);
                if (nextSession) {
                    console.log(`⚠️ Falling back to next available session: ${nextSession}`);
                    startBot(nextSession);
                } else {
                    console.log(`🚨 CRITICAL: All backup sessions have been logged out! No more sessions available. Exiting...`);
                    process.exit(1); 
                }
            } else {
                startBot(currentSessionName); // Reconnect
            }
        } else if (connection === 'open') {
            console.log(`✅ WhatsApp Bot is ready and connected using ${currentSessionName}!`);
        }
    });

    // ── Helper: Safe Reply ──
    async function safeReply(jid, text, quotedMsg = null) {
        try {
            const options = quotedMsg ? { quoted: quotedMsg } : undefined;
            await sock.sendMessage(jid, { text }, options);
        } catch (e) {
            console.warn('⚠️ Failed to send message (possibly invalid quote), retrying without quote:', e.message);
            try {
                await sock.sendMessage(jid, { text });
            } catch (e2) {
                console.error('❌ Failed to send message entirely:', e2.message);
            }
        }
    }

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe || msg.key.remoteJid.includes('@g.us') || msg.key.remoteJid === 'status@broadcast') return;

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        if (!text || text.trim() === '') return;

        const remoteJid = msg.key.remoteJid;
        const phone = remoteJid.split('@')[0];
        const pushName = msg.pushName || "User";

        console.log(`📩 Received message from ${phone} (${pushName}): ${text}`);

        const lowerBody = text.toLowerCase();

        const isAllowedAdmin = allowedAdmins.some(admin => remoteJid.startsWith(admin.split('@')[0]));

        // ── ADMIN HELP ──
        if (isAllowedAdmin && (lowerBody.includes('!admin_help') || lowerBody.includes('!help_admin') || lowerBody.includes('kaise bheju'))) {
            const helpText = `👑 *Admin Commands Guide*\n\n1️⃣ *App Push Notification*\n\`!push 1\` se lekar \`!push 6\`\n\n2️⃣ *Custom Push*\n\`!custom_push Title | Message\`\n\n3️⃣ *Broadcast*\n\`!broadcast Hello sabhi ko!\`\n\n4️⃣ *Update Broadcast*\n\`!broadcast_update [Message]\`\n\n5️⃣ *Trigger Night Tips*\n\`!trigger_night\``;
            await safeReply(remoteJid, helpText, msg);
            return;
        }

        // ── MANUAL TRIGGER FOR NIGHT TIPS ──
        if (isAllowedAdmin && lowerBody === '!trigger_night') {
            await safeReply(remoteJid, "⏳ Fetching and triggering Night Tips manually...", msg);
            try {
                const response = await fetch(`${INTERNAL_API_URL}/api/trigger-daily-tips/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: "paisamitra-daily-2025", type: 'night', force: true })
                });
                const data = await response.json();

                if (data.tips && data.tips.length > 0) {
                    await safeReply(remoteJid, `🌙 Found ${data.tips.length} tips. Sending now...`, msg);
                    for (const tip of data.tips) {
                        try {
                            let cleanPhone = tip.whatsapp_number.replace(/[^0-9]/g, '');
                            let targetJid = `${cleanPhone}@s.whatsapp.net`;
                            await safeReply(targetJid, tip.message);
                            await new Promise(r => setTimeout(r, 5000));
                        } catch (e) {
                            console.warn(`Failed to send to ${tip.whatsapp_number}:`, e.message);
                        }
                    }
                    await safeReply(remoteJid, `✅ Night tips manual broadcast complete!`, msg);
                } else {
                    await safeReply(remoteJid, '🌙 No night tips to send today.', msg);
                }
            } catch (err) {
                await safeReply(remoteJid, `❌ Failed to trigger night tips: ${err.message}`, msg);
            }
            return;
        }

        // ── ADMIN BROADCAST ──
        if (isAllowedAdmin && lowerBody.startsWith('!broadcast ')) {
            const customMessage = text.replace(/^!broadcast /i, '').trim();
            if (!customMessage) return;

            try {
                const result = await pool.query("SELECT DISTINCT phone_number FROM tracker_userprofile WHERE phone_number ~ '^[0-9]{10,15}$'");
                const numbers = result.rows.map(r => r.phone_number);
                await safeReply(remoteJid, `✅ Starting Broadcast to ${numbers.length} users...`, msg);

                let successCount = 0;
                for (const number of numbers) {
                    try {
                        await safeReply(`${number}@s.whatsapp.net`, customMessage);
                        successCount++;
                        await new Promise(r => setTimeout(r, 3000));
                    } catch (e) {}
                }
                await safeReply(remoteJid, `🎉 Broadcast complete! Sent to ${successCount}/${numbers.length} users.`, msg);
            } catch (e) {
                await safeReply(remoteJid, "❌ DB error during broadcast.", msg);
            }
            return;
        }

        if (isAllowedAdmin && lowerBody.startsWith('!broadcast_update')) {
            const downloadLink = "https://smart-expense-coach.onrender.com/static/downloads/ExpenseTracker.apk";
            const defaultMsg = `🚀 *Expense Tracker - Update Available!*\n\n✨ *What's New:*\n• Smart Notepad\n• Refreshed Branding\n\n📲 *Download Now:* ${downloadLink}`;
            const customMessage = text.replace(/^!broadcast_update/i, '').trim() || defaultMsg;

            try {
                const result = await pool.query("SELECT DISTINCT phone_number FROM tracker_userprofile WHERE phone_number ~ '^[0-9]{10,15}$'");
                const numbers = result.rows.map(r => r.phone_number);
                await safeReply(remoteJid, `✅ Starting Update Broadcast to ${numbers.length} users...`, msg);

                let successCount = 0;
                for (const number of numbers) {
                    try {
                        await safeReply(`${number}@s.whatsapp.net`, customMessage);
                        successCount++;
                        await new Promise(r => setTimeout(r, 3000));
                    } catch (e) {}
                }
                await safeReply(remoteJid, `🎉 Broadcast complete! Sent to ${successCount}/${numbers.length} users.`, msg);
            } catch (e) {
                await safeReply(remoteJid, "❌ DB error during broadcast.", msg);
            }
            return;
        }

        // ── ADMIN PUSH NOTIFICATION ──
        if (isAllowedAdmin && (lowerBody.startsWith('!push ') || lowerBody.startsWith('!custom_push '))) {
            let title = "🔔 Notification";
            let body = "Update";

            if (lowerBody.startsWith('!push ')) {
                const optionMatch = text.match(/^!push\s+(\d+)/i);
                const option = optionMatch ? optionMatch[1] : null;
                const pushMessages = {
                    '1': [{ title: "🚀 Keep tracking!", body: "Don't forget to add your recent expenses! 💰" }],
                    '2': [{ title: "💡 Tip of the day!", body: "Small savings everyday make a big difference! 📊" }],
                    '3': [{ title: "☕ Coffee Time?", body: "Did you buy tea or coffee? Add it! 📝" }],
                    '4': [{ title: "💸 Wallet Check", body: "Review your daily spending. 💸" }],
                    '5': [{ title: "📊 Financial Fitness", body: "Log your expenses today! 💪" }],
                    '6': [{ title: "☀️ Good Morning!", body: "Start your day off right by logging your first expense! ☕" }]
                };
                const category = pushMessages[option];
                const selected = category ? category[0] : null; // simplified
                if (!selected) {
                    await safeReply(remoteJid, "❌ Invalid option.", msg);
                    return;
                }
                title = selected.title;
                body = selected.body;
            } else {
                const content = text.replace(/^!custom_push /i, '').trim();
                const parts = content.split('|');
                if (parts.length >= 2) {
                    title = parts[0].trim();
                    body = parts.slice(1).join('|').trim();
                } else {
                    body = content;
                }
            }

            try {
                await safeReply(remoteJid, `⏳ Sending Push: *${title}*...`, msg);
                const response = await fetch(`${INTERNAL_API_URL}/api/send-admin-push/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: "paisamitra-admin-2025", title, body })
                });
                const data = await response.json();
                if (data.status === 'success') {
                    await safeReply(remoteJid, `✅ Push successfully broadcasted!`, msg);
                } else {
                    await safeReply(remoteJid, `❌ Failed to send push: ${data.message}`, msg);
                }
            } catch (err) {
                await safeReply(remoteJid, `❌ Error triggering push: ${err.message}`, msg);
            }
            return;
        }

        // ── PROCESS EXPENSE ──
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 120000);

            const response = await fetch(`${INTERNAL_API_URL}/api/voice-expense/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, text, name: pushName }),
                signal: controller.signal
            });
            clearTimeout(timeout);

            const data = await response.json();
            
            if (data.media) {
                // Buffer to base64
                const mediaBuffer = Buffer.from(data.media.base64, 'base64');
                const mimetype = data.media.mimetype || 'application/pdf';
                await sock.sendMessage(remoteJid, { 
                    document: mediaBuffer, 
                    mimetype: mimetype, 
                    fileName: data.media.filename,
                    caption: data.message
                });
            } else if (data.message) {
                await safeReply(remoteJid, data.message);
            }

        } catch (err) {
            console.error('❌ Error processing message:', err.message);
            // No technical error message as per user request
        }
    });

    // ── CRON JOBS ──
    const isCronScheduled = process.env.NODE_APP_INSTANCE === '0' || !process.env.NODE_APP_INSTANCE;
    if (isCronScheduled) {
        cron.schedule('0 8 * * *', async () => {
            console.log('⏰ Running morning tip cron job (8 AM)...');
            try {
                const response = await fetch(`${INTERNAL_API_URL}/api/trigger-daily-tips/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: "paisamitra-daily-2025", type: 'morning' })
                });
                const data = await response.json();
                if (data.tips && data.tips.length > 0) {
                    for (const tip of data.tips) {
                        try {
                            let cleanPhone = tip.whatsapp_number.replace(/[^0-9]/g, '');
                            await safeReply(`${cleanPhone}@s.whatsapp.net`, tip.message);
                            await new Promise(r => setTimeout(r, 5000));
                        } catch (e) {}
                    }
                }
            } catch (err) {
                console.error('❌ Morning tip cron failed:', err.message);
            }
        }, { timezone: "Asia/Kolkata" });

        cron.schedule('0 22 * * *', async () => {
            console.log('⏰ Running night tip cron job (10 PM)...');
            try {
                const response = await fetch(`${INTERNAL_API_URL}/api/trigger-daily-tips/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ secret: "paisamitra-daily-2025", type: 'night' })
                });
                const data = await response.json();
                if (data.tips && data.tips.length > 0) {
                    for (const tip of data.tips) {
                        try {
                            let cleanPhone = tip.whatsapp_number.replace(/[^0-9]/g, '');
                            await safeReply(`${cleanPhone}@s.whatsapp.net`, tip.message);
                            await new Promise(r => setTimeout(r, 5000));
                        } catch (e) {}
                    }
                }
            } catch (err) {
                console.error('❌ Night tip cron failed:', err.message);
            }
        }, { timezone: "Asia/Kolkata" });
    }
}

// ── EXPRESS API SERVER ──
const app = express();
app.use(express.json());

app.post('/api/send-message', async (req, res) => {
    const to = req.body.to || req.body.phone_number;
    const message = req.body.message;
    
    if (!to || !message) return res.status(400).json({ error: "Missing to/message" });

    try {
        let cleanPhone = String(to).replace(/[^0-9]/g, '');
        if (!globalSock) {
            return res.status(503).json({ error: "WhatsApp bot not connected yet" });
        }
        
        await globalSock.sendMessage(`${cleanPhone}@s.whatsapp.net`, { text: message });
        console.log(`✅ API successfully sent message to ${cleanPhone}`);
        res.json({ success: true, message: `Message sent` });
    } catch (err) {
        console.error('API Send Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3001, '127.0.0.1', () => {
    console.log('🌐 Internal Bot API listening on port 3001 (Localhost only)');
});

startBot();
