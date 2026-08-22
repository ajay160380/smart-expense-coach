#!/bin/bash
# Start WhatsApp Bot locally
echo "🤖 Starting Paisa Mitra WhatsApp Bot..."
cd "$(dirname "$0")/whatsapp_bot" || exit 1
node bot.js
