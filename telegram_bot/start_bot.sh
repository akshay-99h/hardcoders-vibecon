#!/bin/bash
# Startup script for RakshaAI Telegram Bot

export TELEGRAM_BOT_TOKEN="8535707838:AAFkUFWOkO3eVqzdP0T6b5ySo38fVw2SD4Y"
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="raksha_ai"

# Add backend to Python path
export PYTHONPATH="/app/backend:$PYTHONPATH"

echo "🤖 Starting RakshaAI Telegram Bot..."
echo "   Bot: @AapkiRaksha_bot"
echo ""

cd /app/telegram_bot
/root/.venv/bin/python bot.py
