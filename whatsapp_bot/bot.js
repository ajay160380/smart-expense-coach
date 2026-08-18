require('dotenv').config({ path: '../.env' });
const fs = require('fs');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const { PostgresStore } = require('wwebjs-postgres');
const { Pool } = require('pg');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const { restoreSessionFromDB, backupSessionToDB, deleteSessionFromDB } = require('./session_manager');


const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,                // Increased to 5 connections to avoid checkout timeouts
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

pool.on('error', (err, client) => {
    console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
});

// Catch unhandled rejections (like "auth timeout" from whatsapp-web.js) so the bot restarts and recovers instead of freezing
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ Unhandled Promise Rejection:', reason);
    if (reason === 'auth timeout' || (reason && reason.message === 'auth timeout') || String(reason).includes('Session closed')) {
        console.error('❌ Critical WhatsApp error detected. Restarting process to auto-recover...');
        process.exit(1);
    }
});

async function startBot(retryCount = 0) {
    const MAX_RETRIES = 5;
    const BACKOFF_MS = Math.min(5000 * Math.pow(2, retryCount), 60000); // 5s, 10s, 20s, 40s, 60s

    try {
        await pool.query('SELECT 1');
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

    console.log("Starting WhatsApp Bot with LocalAuth + Custom Persistent Storage...");
    await restoreSessionFromDB(pool, "paisa-mitra-v3");

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: "paisa-mitra-v3",
            dataPath: './'
        }),
        authTimeoutMs: 0,
        puppeteer: {
            timeout: 0,       // 0 means no timeout
            protocolTimeout: 0,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-sync',
                '--hide-scrollbars',
                '--mute-audio',
                '--ignore-certificate-errors',
                '--proxy-server="direct://"',
                '--proxy-bypass-list=*',
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

        // Start background session sync every 10 minutes
        setInterval(async () => {
            await backupSessionToDB(pool, "paisa-mitra-v3");
        }, 10 * 60 * 1000);

        if (!isCronScheduled) {
            isCronScheduled = true;
            console.log('📅 Scheduling cron jobs...');

            // ── 💡 DAILY TIP CRON JOB (8:00 AM IST) ──
            cron.schedule('0 8 * * *', async () => {
                console.log('⏰ Running daily tip cron job (8 AM)...');
                const SPACE_URL = "http://127.0.0.1:7860";
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
                const SPACE_URL = "http://127.0.0.1:7860";
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

            // ── ADMIN PUSH NOTIFICATION PROMPT CRON JOB (11:00 AM & 05:00 PM) ──
            cron.schedule('0 11,17 * * *', async () => {
                console.log('⏰ Running Admin Push Prompt cron job...');
                try {
                    const menuText = `👨‍💻 *Admin Push Menu*\nKaunsa message bhejna hai app par?\n\n1️⃣ 🚀 Keep tracking! - Don't forget to add your recent expenses!\n2️⃣ 💡 Tip of the day! - Small savings everyday make a big difference!\n3️⃣ ☕ Coffee Time? - Did you buy tea or coffee?\n4️⃣ 💸 Wallet Check - Review your daily spending.\n5️⃣ 📊 Financial Fitness - Consistency is key.\n\nReply with: !push 1, !push 2, etc.`;
                    
                    // Try to send to Ajay's number
                    const target = "917905398965@c.us";
                    await client.sendMessage(target, menuText);
                    console.log(`✅ Admin Push Prompt sent to ${target}`);
                } catch (err) {
                    console.error('❌ Failed to send Admin Push Prompt:', err.message);
                }
            }, { timezone: "Asia/Kolkata" });
            console.log('📅 Admin Push Prompt cron scheduled for 11:00 AM & 5:00 PM IST');
            
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
        console.log('🔄 Restarting bot due to authentication failure...');
        process.exit(1);
    });

    client.on('disconnected', async (reason) => {
        console.log('⚠️ WhatsApp Client was logged out / disconnected!');
        console.log('Reason:', reason);

        if (reason === 'LOGOUT') {
            console.log('🗑️ WhatsApp invalidated the session. Clearing invalid session from PostgreSQL...');
            try {
                await deleteSessionFromDB(pool, "paisa-mitra-v3");
                console.log('✅ Invalid session cleared successfully. Bot will ask for a fresh QR code scan upon restart.');
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
        const SPACE_URL = "http://127.0.0.1:7860";

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

        // ── ADMIN BROADCAST UPDATE ──
        const allowedAdmins = [
            "917905398965@c.us", // Ajay's admin number
            "7905398965@c.us",   // Ajay's number without 91
            "260391116484637@lid", // Ajay's new LID format
            "917379053923@c.us", // Fallback/Bot number
            process.env.MY_WHATSAPP_NUMBER
        ];

        // ── ADMIN HELP / CHEATSHEET ──
        const lowerBody = msg.body.toLowerCase();
        if (allowedAdmins.includes(msg.from) && (lowerBody.includes('!admin_help') || lowerBody.includes('!help_admin') || lowerBody.includes('kaise bheju') || lowerBody.includes('kaise beju'))) {
            const helpText = `👑 *Admin Commands Guide*\n\n1️⃣ *App Push Notification (Predefined)*\n\`!push 1\` se lekar \`!push 5\`\n(App par notification bhejta hai)\n\n2️⃣ *App Custom Push Notification*\n\`!custom_push Title yaha | Message yaha\`\n(App par custom title aur message bhejta hai)\n\n3️⃣ *WhatsApp Broadcast*\n\`!broadcast Hello sabhi ko!\`\n(Sabhi users ko WhatsApp par message bhejta hai)\n\n4️⃣ *WhatsApp Update Broadcast*\n\`!broadcast_update [Aapka message]\`\n(Sabhi ko WhatsApp par APK download link ke sath message bhejta hai)`;
            await msg.reply(helpText);
            return;
        }

        // ── ADMIN WHATSAPP MESSAGE BROADCAST ──
        if (allowedAdmins.includes(msg.from) && lowerBody.startsWith('!broadcast ')) {
            console.log("📣 Admin initiated WhatsApp broadcast!");
            const customMessage = msg.body.replace(/^!broadcast /i, '').trim();
            
            if (!customMessage) {
                await msg.reply("❌ Please provide a message. Example: !broadcast Hello everyone!");
                return;
            }

            try {
                const result = await pool.query("SELECT DISTINCT phone_number FROM tracker_userprofile WHERE phone_number ~ '^[0-9]{10,15}$'");
                const numbers = result.rows.map(r => r.phone_number);

                await msg.reply(`✅ Starting WhatsApp Broadcast to ${numbers.length} users... Please wait.`);

                let successCount = 0;
                for (const number of numbers) {
                    try {
                        const chatId = `${number}@c.us`;
                        await client.sendMessage(chatId, customMessage);
                        successCount++;
                        // Delay to avoid WhatsApp spam limits
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } catch (e) {
                        console.error(`Failed to send broadcast to ${number}:`, e.message);
                    }
                }
                await msg.reply(`🎉 WhatsApp Broadcast complete! Successfully sent to ${successCount}/${numbers.length} users.`);
            } catch (dbErr) {
                console.error("DB error during broadcast:", dbErr);
                await msg.reply("❌ Failed to fetch users from database.");
            }
            return;
        }
        if (allowedAdmins.includes(msg.from) && lowerBody.startsWith('!broadcast_update')) {
            console.log("📣 Admin initiated broadcast update!");

            const downloadLink = "https://ajay160380-paisa-mitra.hf.space/static/downloads/ExpenseTracker.apk";
            const defaultMsg = `🚀 *Expense Tracker - Important Update Available!*\n\nHello there! 👋 We've just released a major update to your Expense Tracker app with some exciting new additions.\n\n✨ *What's New:*\n• *Smart Notepad:* A brand-new feature to quickly jot down your financial notes and reminders directly within the app! 📝\n• *Refreshed Branding:* Enjoy our beautiful new app icon and a sleeker UI experience. 🎨\n• *Performance Boost:* We've squashed some bugs to make your expense tracking faster and smoother than ever. ⚡\n\n⚠️ *IMPORTANT:* To enjoy these new features, please *DELETE* your old Expense Tracker app first, and then download and install the new version from the link below:\n\n📲 *Download Now:* ${downloadLink}\n\nThank you for trusting Expense Tracker! 💼`;
            
            const customMessage = msg.body.replace(/^!broadcast_update/i, '').trim() || defaultMsg;

            try {
                const result = await pool.query("SELECT DISTINCT phone_number FROM tracker_userprofile WHERE phone_number ~ '^[0-9]{10,15}$'");
                const numbers = result.rows.map(r => r.phone_number);

                await msg.reply(`✅ Starting TEXT ONLY broadcast with Download Link to ${numbers.length} users... Please wait.`);

                let successCount = 0;
                for (const number of numbers) {
                    try {
                        const chatId = `${number}@c.us`;
                        
                        // Send text with link
                        await client.sendMessage(chatId, customMessage);
                        
                        successCount++;
                        // Delay to avoid WhatsApp spam limits
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } catch (e) {
                        console.error(`Failed to send broadcast to ${number}:`, e.message);
                    }
                }
                await msg.reply(`🎉 Broadcast complete! Successfully sent to ${successCount}/${numbers.length} users.`);
            } catch (dbErr) {
                console.error("DB error during broadcast:", dbErr);
                await msg.reply("❌ Failed to fetch users from database.");
            }
            return;
        }

        // ── ADMIN PUSH NOTIFICATION LISTENER ──
        if (allowedAdmins.includes(msg.from) && lowerBody.startsWith('!push ')) {
            const option = msg.body.replace(/^!push /i, '').trim().split(' ')[0];
            
            const pushMessages = {
                '1': [
                    { title: "🚀 Keep tracking!", body: "Don't forget to add your recent expenses! Keep your budget on track. 💰" },
                    { title: "🎯 Stay on Target", body: "Every rupee counts. Take a minute to log your expenses! 📉" },
                    { title: "📝 Quick Update", body: "Spent something recently? Add it now before you forget! 💸" },
                    { title: "💡 Budget Reminder", body: "Logging expenses daily is the key to financial freedom! 🚀" }
                ],
                '2': [
                    { title: "💡 Tip of the day!", body: "Small savings everyday make a big difference! Have you checked your dashboard today? 📊" },
                    { title: "🧠 Smart Spender", body: "Before your next purchase, ask: 'Do I really need this?' 🤔" },
                    { title: "💰 Money Hack", body: "Try the 24-hour rule before buying non-essentials! ⏳" },
                    { title: "🌟 Financial Wisdom", body: "It's not about how much you make, it's about how much you save! 💎" }
                ],
                '3': [
                    { title: "☕ Coffee Time?", body: "Did you buy tea or coffee? Add it to your expenses! 📝" },
                    { title: "🍔 Lunch Break", body: "Just had lunch or snacks? Track it real quick! 🍟" },
                    { title: "🍿 Snack Attack", body: "Small cravings can add up. Make sure to log them! 😋" },
                    { title: "🛒 Grocery Run", body: "Did you buy groceries today? Update your Expense Tracker! 🥦" }
                ],
                '4': [
                    { title: "💸 Wallet Check", body: "Review your daily spending and stay on budget. 💸" },
                    { title: "🔎 Budget Review", body: "Take a peek at your dashboard. Are you within your limits? 📉" },
                    { title: "💳 Card Swipe", body: "Used your credit card today? Make sure it's tracked! 💳" },
                    { title: "📱 UPI Check", body: "Any recent UPI payments? Just say it or add it! 🎙️" }
                ],
                '5': [
                    { title: "📊 Financial Fitness", body: "Consistency is key. Log your expenses today! 💪" },
                    { title: "🏆 Daily Streak", body: "Don't break your tracking streak. Keep it up! 🔥" },
                    { title: "📈 Wealth Building", body: "Small daily habits lead to massive financial results! 🌟" },
                    { title: "🚀 Next Level", body: "Ready to hit your savings goals? Keep tracking! 🎯" }
                ]
            };
            
            const category = pushMessages[option];
            const selected = category ? category[Math.floor(Math.random() * category.length)] : null;
            if (!selected) {
                await msg.reply("❌ Invalid option. Please send '!push 1' to '!push 5'.");
                return;
            }
            
            try {
                await msg.reply(`⏳ Sending Push Notification: *${selected.title}*...`);
                // Use SPACE_URL to call the Django endpoint
                const url = `${SPACE_URL}/api/send-admin-push/`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        secret: "paisamitra-admin-2025", 
                        title: selected.title, 
                        body: selected.body 
                    })
                });
                const data = await response.json();
                if (data.status === 'success') {
                    await msg.reply(`✅ Push Notification successfully broadcasted to all users!`);
                } else {
                    await msg.reply(`❌ Failed to send push: ${data.message}`);
                }
            } catch (err) {
                console.error("Error triggering push:", err);
                await msg.reply(`❌ Error triggering push: ${err.message}`);
            }
            return;
        }

        // ── ADMIN CUSTOM PUSH NOTIFICATION LISTENER ──
        if (allowedAdmins.includes(msg.from) && lowerBody.startsWith('!custom_push ')) {
            const content = msg.body.replace(/^!custom_push /i, '').trim();
            const parts = content.split('|');
            let title = "🔔 Notification";
            let body = content;
            if (parts.length >= 2) {
                title = parts[0].trim();
                body = parts.slice(1).join('|').trim();
            }
            
            try {
                await msg.reply(`⏳ Sending Custom Push Notification: *${title}*...`);
                const url = `${SPACE_URL}/api/send-admin-push/`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        secret: "paisamitra-admin-2025", 
                        title: title, 
                        body: body 
                    })
                });
                const data = await response.json();
                if (data.status === 'success') {
                    await msg.reply(`✅ Custom Push Notification successfully broadcasted to all users!`);
                } else {
                    await msg.reply(`❌ Failed to send custom push: ${data.message}`);
                }
            } catch (err) {
                console.error("Error triggering custom push:", err);
                await msg.reply(`❌ Error triggering custom push: ${err.message}`);
            }
            return;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 120000); // 120 second timeout

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
                try {
                    const tempFilePath = `/tmp/${data.media.filename}`;
                    fs.writeFileSync(tempFilePath, data.media.base64, 'base64');
                    const media = MessageMedia.fromFilePath(tempFilePath);
                    await msg.reply(media, undefined, { caption: data.message || "Here is your file.", sendMediaAsDocument: true });
                    fs.unlinkSync(tempFilePath);
                } catch (mediaErr) {
                    console.error('❌ Failed to send file, sending as text fallback:', mediaErr.message);
                    const csvText = Buffer.from(data.media.base64, 'base64').toString('utf-8');
                    await safeReply(msg, `${data.message}\n\n*CSV Data:*\n\`\`\`\n${csvText.substring(0, 3000)}\n\`\`\``);
                }
            }
            // Priority 1: Direct message field (covers both success and error cases)
            else if (data.message) {
                await safeReply(msg, data.message);
            }
            // Priority 2: Chat response from AI
            else if (data.chat_response) {
                await safeReply(msg, data.chat_response);
            }
            // Priority 2.5: General AI reply
            else if (data.reply) {
                await safeReply(msg, data.reply);
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
            // Removed the "technical issue" message as requested by the user
        }
    });

    // Graceful shutdown handlers for Hugging Face Spaces / Docker
    const gracefulShutdown = async () => {
        console.log('Shutting down gracefully...');
        try {
            await backupSessionToDB(pool, "paisa-mitra-v3");
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
