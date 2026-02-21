#!/bin/bash
# Startup script for RakshaAI Reminder Scheduler

export TELEGRAM_BOT_TOKEN="8535707838:AAFkUFWOkO3eVqzdP0T6b5ySo38fVw2SD4Y"
export MONGO_URL="mongodb://localhost:27017"
export DB_NAME="raksha_ai"

# Add backend to Python path
export PYTHONPATH="/app/backend:$PYTHONPATH"

echo "🕐 Starting RakshaAI Reminder Scheduler..."
echo "   Running every 1 hour"
echo ""

cd /app/telegram_bot
/root/.venv/bin/python scheduler.py
