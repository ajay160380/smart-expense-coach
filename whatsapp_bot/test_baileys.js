const { makeWASocket } = require('@whiskeysockets/baileys');
console.log("Checking if this crashes...")
// Fake sock
const sock = {
    sendMessage: async (jid, content, options) => {
        console.log("Sending:", jid, content, options);
        if (options && options.quoted === null) {
            throw new Error("Cannot read properties of null (reading 'key')");
        }
    }
};

async function safeReply(jid, text, quotedMsg = null) {
    try {
        await sock.sendMessage(jid, { text }, { quoted: quotedMsg });
    } catch (e) {
        console.error('❌ Failed to send message:', e.message);
    }
}
safeReply("test", "test");
