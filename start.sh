#!/bin/bash
echo "🚀 Starting BOTH Django Website and WhatsApp Bot (Baileys Lightweight Version)..."
exec supervisord -c supervisord.conf
