const fs = require('fs');

const code = fs.readFileSync('../bot.js', 'utf8');

const insertion = `
        // ── ADMIN BROADCAST UPDATE ──
        if (msg.from === (process.env.MY_WHATSAPP_NUMBER || "917379053923@c.us") && msg.body.startsWith('!broadcast_update')) {
            console.log("📣 Admin initiated broadcast update!");
            let media = null;
            if (msg.hasMedia) {
                media = await msg.downloadMedia();
            } else if (msg.hasQuotedMsg) {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg.hasMedia) {
                    media = await quotedMsg.downloadMedia();
                }
            }

            if (!media) {
                return msg.reply("⚠️ No media found! Please attach the APK file or reply to an APK file with:\\n!broadcast_update [Your Message]");
            }

            const customMessage = msg.body.replace('!broadcast_update', '').trim() || "🚀 *Paisa Mitra New Update!*\\n\\nNaya Notepad feature add ho gaya hai aur bahut saare bugs fix kiye gaye hain.\\n\\nPurana app delete karein aur ye naya APK install karein!";

            try {
                const result = await pool.query("SELECT DISTINCT username FROM auth_user WHERE username ~ '^[0-9]{10,15}$'");
                const numbers = result.rows.map(r => r.username);

                await msg.reply(\`✅ Starting APK broadcast to \${numbers.length} users... Please wait.\`);

                let successCount = 0;
                for (const number of numbers) {
                    try {
                        const chatId = \`\${number}@c.us\`;
                        await client.sendMessage(chatId, media, { caption: customMessage, sendMediaAsDocument: true });
                        successCount++;
                        // Delay to avoid WhatsApp spam limits
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    } catch (e) {
                        console.error(\`Failed to send broadcast to \${number}:\`, e.message);
                    }
                }
                await msg.reply(\`🎉 Broadcast complete! Successfully sent to \${successCount}/\${numbers.length} users.\`);
            } catch (dbErr) {
                console.error("DB error during broadcast:", dbErr);
                await msg.reply("❌ Failed to fetch users from database.");
            }
            return;
        }
`;

// Insert it right after the try-catch for contact fetching (line ~351)
// We look for:
// const text = msg.body;
// console.log(`📩 Received message from ${phone}

const targetString = "const text = msg.body;";
if (code.includes(targetString)) {
    const updatedCode = code.replace(targetString, insertion + '\n        ' + targetString);
    fs.writeFileSync('../bot.js', updatedCode);
    console.log("Successfully patched bot.js");
} else {
    console.log("Could not find target string");
}
