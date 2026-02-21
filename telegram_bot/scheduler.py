"""
Background Scheduler for RakshaAI Telegram Reminders
Runs every hour to send pending reminders
"""
import os
import logging
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from telegram import Bot
from telegram.error import TelegramError, Forbidden
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
DB_NAME = os.getenv("DB_NAME", "raksha_ai")
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]

# Telegram bot
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
bot = Bot(token=BOT_TOKEN)


async def send_reminder(chat_id: int, service_type: str, action_type: str, reminder_data: dict = None) -> bool:
    """
    Send reminder message to user
    Returns True if successful, False otherwise
    
    Args:
        chat_id: Telegram chat ID
        service_type: Type of service (e.g., "RTI Application")
        action_type: Action type (rti, complaint, etc.)
        reminder_data: Additional reminder metadata (e.g., created_at for calculating days)
    """
    try:
        # Check if RTI is overdue (>30 days) and offer First Appeal
        is_rti_overdue = False
        if action_type == "rti" and reminder_data:
            created_at = reminder_data.get("created_at")
            if created_at:
                days_since_creation = (datetime.utcnow() - created_at).days
                # RTI response due in 30 days, so if created >30 days ago, it's overdue
                if days_since_creation > 30:
                    is_rti_overdue = True
        
        # Create reminder message based on action type and status
        if action_type == "rti":
            if is_rti_overdue:
                message = (
                    f"⚠️ *RTI OVERDUE - First Appeal Available*\n\n"
                    f"Your {service_type} was filed more than 30 days ago. "
                    f"As per RTI Act Section 7, you should have received a response by now.\n\n"
                    f"*Next Steps:*\n"
                    f"1️⃣ File First Appeal (Section 19) - I can generate this for you\n"
                    f"2️⃣ Check RTI status online at rtionline.gov.in\n"
                    f"3️⃣ Contact the Public Information Officer directly\n\n"
                    f"*Would you like me to generate a First Appeal?*\n"
                    f"Reply 'Yes' to generate First Appeal, or ask me anything else!"
                )
            else:
                message = (
                    f"⏰ *Reminder: RTI Follow-up*\n\n"
                    f"Your {service_type} may still be pending.\n\n"
                    f"*You can:*\n"
                    f"1️⃣ Check status on rtionline.gov.in\n"
                    f"2️⃣ Generate First Appeal (if 30 days passed)\n"
                    f"3️⃣ File complaint with higher authority\n\n"
                    f"Reply with what you'd like to do, or ask me any question!"
                )
        elif action_type == "complaint":
            message = (
                f"⏰ *Reminder: Complaint Follow-up*\n\n"
                f"Your {service_type} may need follow-up action.\n\n"
                f"*You can:*\n"
                f"1️⃣ Generate RTI application\n"
                f"2️⃣ Escalate to higher authority\n"
                f"3️⃣ File grievance on CPGRAMS\n\n"
                f"Reply with what you'd like to do, or ask me any question!"
            )
        else:
            message = (
                f"⏰ *Reminder: Document Follow-up*\n\n"
                f"Your {service_type} may need attention.\n\n"
                f"*What would you like to do?*\n"
                f"1️⃣ Check status\n"
                f"2️⃣ Escalate further\n"
                f"3️⃣ Generate another document\n\n"
                f"Reply with option number or ask me anything!"
            )
        
        # Send message
        await bot.send_message(
            chat_id=chat_id,
            text=message,
            parse_mode='Markdown'
        )
        
        logger.info(f"✅ Sent reminder to {chat_id} for {service_type} (Overdue: {is_rti_overdue})")
        return True
        
    except Forbidden:
        # User blocked the bot
        logger.warning(f"User {chat_id} blocked the bot")
        return False
        
    except TelegramError as e:
        # Other Telegram errors
        logger.error(f"Telegram error sending to {chat_id}: {e}")
        return False
        
    except Exception as e:
        # General errors
        logger.error(f"Error sending reminder to {chat_id}: {e}")
        return False


async def process_reminders():
    """
    Check for pending reminders and send them
    Runs every hour
    """
    try:
        current_time = datetime.utcnow()
        logger.info(f"🔍 Checking for reminders... ({current_time.strftime('%Y-%m-%d %H:%M:%S')})")
        
        # Find pending reminders that are due
        cursor = db.telegram_reminders.find({
            "reminder_date": {"$lte": current_time},
            "status": "pending"
        })
        
        reminders = await cursor.to_list(length=1000)
        
        if not reminders:
            logger.info("No pending reminders to process")
            return
        
        logger.info(f"Found {len(reminders)} reminder(s) to process")
        
        # Process each reminder
        for reminder in reminders:
            chat_id = reminder["chat_id"]
            service_type = reminder["service_type"]
            action_type = reminder["action_type"]
            reminder_id = reminder["_id"]
            
            # Check if user has notifications enabled
            user = await db.telegram_users.find_one({"chat_id": chat_id})
            
            if not user or not user.get("notifications_enabled", False):
                logger.info(f"User {chat_id} has notifications disabled, skipping")
                # Mark as failed
                await db.telegram_reminders.update_one(
                    {"_id": reminder_id},
                    {"$set": {"status": "failed", "updated_at": current_time}}
                )
                continue
            
            # Send reminder
            success = await send_reminder(
                chat_id=chat_id, 
                service_type=service_type, 
                action_type=action_type,
                reminder_data=reminder  # Pass reminder data to check overdue status
            )
            
            # Update status
            if success:
                await db.telegram_reminders.update_one(
                    {"_id": reminder_id},
                    {"$set": {"status": "sent", "sent_at": current_time}}
                )
                logger.info(f"✅ Reminder sent and marked as 'sent': {reminder_id}")
            else:
                await db.telegram_reminders.update_one(
                    {"_id": reminder_id},
                    {"$set": {"status": "failed", "failed_at": current_time}}
                )
                logger.info(f"❌ Reminder failed and marked as 'failed': {reminder_id}")
        
        logger.info(f"Processed {len(reminders)} reminder(s)")
        
    except Exception as e:
        logger.error(f"Error in process_reminders: {e}")
        import traceback
        traceback.print_exc()


async def create_indexes():
    """Create database indexes for performance"""
    try:
        # Index on chat_id for users
        await db.telegram_users.create_index("chat_id", unique=True)
        
        # Index on reminder_date and status for reminders
        await db.telegram_reminders.create_index([
            ("reminder_date", 1),
            ("status", 1)
        ])
        
        # Index on chat_id for reminders
        await db.telegram_reminders.create_index("chat_id")
        
        logger.info("✅ Database indexes created")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")


def main():
    """Start the reminder scheduler"""
    if not BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN not set in environment")
    
    logger.info("🕐 Starting RakshaAI Reminder Scheduler...")
    
    # Create async event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    # Create indexes
    loop.run_until_complete(create_indexes())
    
    # Create scheduler with explicit event loop
    scheduler = AsyncIOScheduler(event_loop=loop)
    
    # Add job - run every hour
    scheduler.add_job(
        process_reminders,
        'interval',
        hours=1,
        id='reminder_job',
        replace_existing=True
    )
    
    # Run immediately on start (for testing)
    scheduler.add_job(
        process_reminders,
        'date',
        run_date=datetime.now(),
        id='initial_run'
    )
    
    # Start scheduler
    scheduler.start()
    
    logger.info("✅ Scheduler started! Running every 1 hour")
    logger.info("Press Ctrl+C to exit")
    
    # Keep running
    try:
        loop.run_forever()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Stopping scheduler...")
        scheduler.shutdown()


if __name__ == '__main__':
    main()
