#!/bin/bash

# If running on Render, only start Django (to save memory)
if [ "$PLATFORM" = "render" ]; then
    echo "🚀 [RENDER MODE] Starting Django Website ONLY..."
    cd backend
    python manage.py migrate
    exec python manage.py runserver --noreload 0.0.0.0:${PORT:-10000} --insecure

# If running on Hugging Face, only start the WhatsApp Bot
elif [ "$PLATFORM" = "hf" ]; then
    echo "🤖 [HUGGING FACE MODE] Starting WhatsApp Bot ONLY..."
    cd whatsapp_bot
    exec node bot.js

# Default: Run BOTH using Supervisord (Local / High RAM systems)
else
    echo "🚀 [DEFAULT MODE] Starting BOTH Django and Bot..."
    exec supervisord -c supervisord.conf
fi
