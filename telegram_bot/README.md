# RakshaAI Telegram Bot - Reminder & Notification System

Multi-user consent-based reminder system for document follow-ups.

## Features

✅ Multi-user support  
✅ User consent required  
✅ Multiple reminders per user  
✅ Unsubscribe functionality  
✅ Background scheduler (runs every 1 hour)  
✅ Document generation integration  
✅ MongoDB for persistent storage  

## Setup

### 1. Create Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy the bot token

### 2. Environment Variables

Add to `/app/backend/.env`:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here

# MongoDB (already configured)
MONGO_URL=mongodb://localhost:27017
DB_NAME=raksha_ai
```

### 3. Database Collections

The bot automatically creates:

**telegram_users:**
- chat_id (unique, indexed)
- username
- first_name
- notifications_enabled (boolean)
- created_at

**telegram_reminders:**
- chat_id
- service_type
- action_type
- reminder_date (indexed)
- status (indexed) - pending/sent/failed
- created_at

### 4. Run the Bot

```bash
# Terminal 1: Run the bot
cd /app/telegram_bot
python bot.py

# Terminal 2: Run the scheduler (in background)
cd /app/telegram_bot
python scheduler.py
```

Or use supervisor (recommended for production):

```bash
# Add to supervisor config
sudo nano /etc/supervisor/conf.d/telegram.conf
```

```ini
[program:telegram_bot]
command=/root/.venv/bin/python /app/telegram_bot/bot.py
directory=/app/telegram_bot
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/telegram_bot.err.log
stdout_logfile=/var/log/supervisor/telegram_bot.out.log

[program:telegram_scheduler]
command=/root/.venv/bin/python /app/telegram_bot/scheduler.py
directory=/app/telegram_bot
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/telegram_scheduler.err.log
stdout_logfile=/var/log/supervisor/telegram_scheduler.out.log
```

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start telegram_bot telegram_scheduler
```

## Usage

### User Commands

- `/start` - Register and see welcome message
- `/help` - Show available features
- `/generate` - Generate a document
- `/stop_notifications` - Disable all reminders

### Conversation Flow

**Document Generation:**
```
User: "I want to file an RTI for passport delay"
Bot: [Asks for required fields]
User: [Provides details]
Bot: [Generates RTI document]
Bot: "Would you like a follow-up reminder?
      1 - Yes
      2 - No"
User: "1"
Bot: "After how many days? (Default 15)"
User: "30"
Bot: "✅ Reminder set for [date]"
```

**Reminder Notification:**
```
Bot: "⏰ Reminder: Your RTI Application may still be pending.

You can:
1️⃣ Generate First Appeal
2️⃣ Escalate further

Reply with option number."
```

**Unsubscribe:**
```
User: /stop_notifications
Bot: "🔕 Notifications Disabled
     Deleted 2 pending reminder(s).
     You will no longer receive follow-up reminders."
```

## How It Works

### 1. User Registration
- When user sends `/start`, their chat_id is stored
- No duplicate users created

### 2. Document Generation
- User asks for document generation
- Bot uses same ChatAgent as web app
- Document is generated and sent

### 3. Reminder Consent
- After document, bot asks for reminder preference
- If yes, asks for number of days
- Creates reminder in database

### 4. Background Scheduler
- Runs every 1 hour
- Checks for reminders where `reminder_date <= current_time`
- Sends notification via Telegram
- Updates status to 'sent' or 'failed'

### 5. Safety Features
- Prevents duplicate reminders (same user + service + pending)
- Handles bot blocking (marks as failed)
- Respects notifications_enabled flag
- Indexes for performance

## Testing

### Test Reminder Flow

```bash
# 1. Start bot
python bot.py

# 2. In Telegram:
# - /start
# - "Generate RTI for income tax"
# - Provide details
# - Select "1 - Yes" for reminder
# - Enter "0" days (for immediate test)

# 3. Run scheduler manually
python scheduler.py

# 4. Check logs
tail -f /var/log/supervisor/telegram_scheduler.out.log
```

### Test Unsubscribe

```
# In Telegram:
/stop_notifications

# Expected:
# - notifications_enabled = false
# - All pending reminders deleted
# - Confirmation message sent
```

## Architecture

```
User → Telegram Bot → ChatAgent → AI Response
                ↓
         Store Reminder
                ↓
        Background Scheduler (every 1 hour)
                ↓
         Send Notification
```

## Safety & Privacy

✅ **User Consent Required**: Reminders only if user opts in  
✅ **Unsubscribe Anytime**: `/stop_notifications` command  
✅ **No Spam**: Only sends reminder on specified date  
✅ **Privacy Preserved**: No sensitive data in reminders  
✅ **Bot Blocking Handled**: Marks as failed if user blocks bot  

## Monitoring

### Check Status

```bash
# Bot status
sudo supervisorctl status telegram_bot

# Scheduler status
sudo supervisorctl status telegram_scheduler

# View logs
tail -f /var/log/supervisor/telegram_bot.out.log
tail -f /var/log/supervisor/telegram_scheduler.out.log
```

### Database Queries

```javascript
// Check users
db.telegram_users.find({notifications_enabled: true})

// Check pending reminders
db.telegram_reminders.find({status: "pending"})

// Check sent reminders
db.telegram_reminders.find({status: "sent"}).sort({sent_at: -1})
```

## Troubleshooting

**Bot not responding:**
```bash
# Check if running
sudo supervisorctl status telegram_bot

# Check logs
tail -50 /var/log/supervisor/telegram_bot.err.log

# Restart
sudo supervisorctl restart telegram_bot
```

**Reminders not sending:**
```bash
# Check scheduler
sudo supervisorctl status telegram_scheduler

# Check logs
tail -50 /var/log/supervisor/telegram_scheduler.out.log

# Verify bot token
grep TELEGRAM_BOT_TOKEN /app/backend/.env

# Test manually
cd /app/telegram_bot && python -c "
from scheduler import process_reminders
import asyncio
asyncio.run(process_reminders())
"
```

**User blocked bot:**
- Status automatically marked as 'failed'
- No action needed
- User can restart with `/start` if they unblock

## Dependencies

- `python-telegram-bot==22.6` - Telegram Bot API
- `APScheduler==3.11.2` - Background scheduler
- `motor` - MongoDB async driver (already installed)

## Production Checklist

- [ ] Set TELEGRAM_BOT_TOKEN in environment
- [ ] Configure supervisor for auto-start
- [ ] Set up MongoDB indexes
- [ ] Test reminder flow end-to-end
- [ ] Monitor logs for first 24 hours
- [ ] Set up alerts for failures

## License

Part of RakshaAI - Citizen Empowerment Platform
