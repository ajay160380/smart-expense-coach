require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "paisa-mitra",
        dataPath: './.wwebjs_auth'
    }),
        puppeteer: {
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
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
    });

    client.on('remote_session_saved', () => {
        console.log('✅ WhatsApp Session successfully saved to PostgreSQL!');
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

    client.initialize();
