#!/bin/bash
APK_FILE="backend/tracker/static/downloads/ExpenseTracker.apk"
mkdir -p backend/tracker/static/downloads
if [ ! -f "$APK_FILE" ] || [ $(wc -c < "$APK_FILE" 2>/dev/null || echo 0) -lt 10000000 ]; then
    echo "⬇️ Pre-caching ExpenseTracker.apk for instant downloads with exact Content-Length..."
    curl -f -L "https://expo.dev/artifacts/eas/lkOyrCIa2oMeJqeW0pIUlV0HZO-xWeTltMH85XW3xN4.apk" -o "$APK_FILE" || true
fi

echo "🚀 Starting BOTH Django Website and WhatsApp Bot (Baileys Lightweight Version)..."
exec supervisord -c supervisord.conf
