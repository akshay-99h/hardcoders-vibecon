"""
Telegram Bot for RakshaAI - Reminder & Notification System
Multi-user consent-based reminder system
"""
import os
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ConversationHandler,
    ContextTypes,
    filters
)
from motor.motor_asyncio import AsyncIOMotorClient
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

# Conversation states
ASKING_REMINDER, ASKING_DAYS = range(2)

# Temporary storage for document context
user_document_context: Dict[int, Dict] = {}


# ============================================================================
# USER MANAGEMENT
# ============================================================================

async def get_or_create_user(chat_id: int, username: str, first_name: str):
    """Get existing user or create new one"""
    user = await db.telegram_users.find_one({"chat_id": chat_id})
    
    if not user:
        user_data = {
            "chat_id": chat_id,
            "username": username,
            "first_name": first_name,
            "notifications_enabled": False,
            "created_at": datetime.utcnow()
        }
        await db.telegram_users.insert_one(user_data)
        logger.info(f"Created new user: {chat_id} ({first_name})")
        return user_data
    
    return user


async def update_notifications_enabled(chat_id: int, enabled: bool):
    """Update notification preference"""
    await db.telegram_users.update_one(
        {"chat_id": chat_id},
        {"$set": {"notifications_enabled": enabled}}
    )


# ============================================================================
# REMINDER MANAGEMENT
# ============================================================================

async def create_reminder(
    chat_id: int,
    service_type: str,
    action_type: str,
    days: int
):
    """Create a new reminder"""
    # Check for duplicate
    existing = await db.telegram_reminders.find_one({
        "chat_id": chat_id,
        "service_type": service_type,
        "status": "pending"
    })
    
    if existing:
        logger.info(f"Reminder already exists for {chat_id} - {service_type}")
        return False
    
    reminder_date = datetime.utcnow() + timedelta(days=days)
    
    reminder = {
        "chat_id": chat_id,
        "service_type": service_type,
        "action_type": action_type,
        "reminder_date": reminder_date,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    await db.telegram_reminders.insert_one(reminder)
    
    # Enable notifications for user
    await update_notifications_enabled(chat_id, True)
    
    logger.info(f"Created reminder for {chat_id}: {service_type} in {days} days")
    return True


async def delete_user_reminders(chat_id: int):
    """Delete all pending reminders for a user"""
    result = await db.telegram_reminders.delete_many({
        "chat_id": chat_id,
        "status": "pending"
    })
    return result.deleted_count


# ============================================================================
# COMMAND HANDLERS
# ============================================================================

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    user = update.effective_user
    chat_id = update.effective_chat.id
    
    # Create or get user
    await get_or_create_user(
        chat_id=chat_id,
        username=user.username or "",
        first_name=user.first_name or "User"
    )
    
    welcome_message = (
        f"🙏 Namaste {user.first_name}!\n\n"
        "Welcome to *RakshaAI* - Your trusted assistant for Indian government services, "
        "legal rights, and civic processes.\n\n"
        "*What I can help you with:*\n"
        "📄 Generate RTI applications\n"
        "📝 Write complaint letters\n"
        "📧 Draft emails to authorities\n"
        "⏰ Set follow-up reminders\n\n"
        "*Available Commands:*\n"
        "/help - Show available features\n"
        "/generate - Generate a document\n"
        "/stop\\_notifications - Disable reminders\n\n"
        "Just ask me anything like:\n"
        "• \"How to apply for Aadhaar?\"\n"
        "• \"Generate RTI for passport\"\n"
        "• \"Complaint letter for PAN delay\""
    )
    
    await update.message.reply_text(welcome_message, parse_mode='Markdown')


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    help_text = (
        "*RakshaAI Help* 📚\n\n"
        "*Ask Questions:*\n"
        "• How to apply for PAN card?\n"
        "• What documents for passport?\n"
        "• How to file consumer complaint?\n\n"
        "*Generate Documents:*\n"
        "• Generate RTI application\n"
        "• Write complaint letter\n"
        "• Draft email to bank\n\n"
        "*Reminders:*\n"
        "After document generation, I'll ask if you want a follow-up reminder.\n\n"
        "*Commands:*\n"
        "/start - Start bot\n"
        "/help - This help message\n"
        "/generate - Generate document\n"
        "/stop\\_notifications - Disable reminders\n\n"
        "*Privacy:*\n"
        "Never share Aadhaar/PAN numbers with me. "
        "I'll never ask for OTPs or passwords."
    )
    
    await update.message.reply_text(help_text, parse_mode='Markdown')


async def stop_notifications_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /stop_notifications command"""
    chat_id = update.effective_chat.id
    
    # Disable notifications
    await update_notifications_enabled(chat_id, False)
    
    # Delete all pending reminders
    deleted_count = await delete_user_reminders(chat_id)
    
    message = (
        "🔕 *Notifications Disabled*\n\n"
        f"Deleted {deleted_count} pending reminder(s).\n"
        "You will no longer receive follow-up reminders.\n\n"
        "You can re-enable notifications by generating a new document "
        "and opting for reminders."
    )
    
    await update.message.reply_text(message, parse_mode='Markdown')


# ============================================================================
# DOCUMENT GENERATION WITH REMINDER FLOW
# ============================================================================

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle user messages - integrate with chat agent"""
    from services.chat_agent import ChatAgent
    
    user = update.effective_user
    chat_id = update.effective_chat.id
    user_message = update.message.text
    
    # Get or create user
    await get_or_create_user(chat_id, user.username or "", user.first_name)
    
    # Check if user is responding to First Appeal offer
    user_message_lower = user_message.lower().strip()
    if user_message_lower in ['yes', '1', 'first appeal', 'appeal', 'generate appeal', 'generate first appeal']:
        # Check if user has an overdue RTI
        overdue_rti = await db.telegram_reminders.find_one({
            "chat_id": chat_id,
            "action_type": "rti",
            "status": {"$in": ["pending", "sent"]}
        }, sort=[("created_at", 1)])
        
        if overdue_rti:
            # Check if it's actually overdue (>30 days)
            days_since = (datetime.utcnow() - overdue_rti["created_at"]).days
            if days_since > 30:
                # Trigger First Appeal generation
                await update.message.reply_text(
                    "📝 *Generating First Appeal*\n\n"
                    "I'll help you draft a First Appeal under Section 19(1) of RTI Act.\n\n"
                    "Please provide the following details:",
                    parse_mode='Markdown'
                )
                
                # Ask for First Appeal details via chat agent
                prompt = (
                    f"User wants to generate a First Appeal for an overdue RTI application. "
                    f"Please collect the following details:\n"
                    f"1. User's full name and address\n"
                    f"2. Original RTI filing date\n"
                    f"3. Original RTI reference/receipt number (if any)\n"
                    f"4. Department name where RTI was filed\n"
                    f"5. First Appellate Authority name (or designation if unknown)\n"
                    f"6. Information that was originally requested\n\n"
                    f"Once you have all details, generate the First Appeal document using the template."
                )
                
                user_message = prompt
    
    # Process with chat agent
    chat_agent = ChatAgent()
    
    try:
        # Send "typing" indicator
        await update.message.chat.send_action("typing")
        
        # Get response from chat agent
        result = await chat_agent.process({
            "user_input": user_message,
            "conversation_id": str(chat_id),
            "include_context": True
        })
        
        response = result.get("message", "Sorry, I couldn't process that.")
        
        # Check if this is a generated document
        if is_generated_document(response):
            # Store document context for reminder flow
            user_document_context[chat_id] = {
                "document_type": detect_document_type(response),
                "generated_at": datetime.utcnow()
            }
            
            # Send document
            await update.message.reply_text(response)
            
            # Ask for reminder
            keyboard = [['1 - Yes', '2 - No']]
            reply_markup = ReplyKeyboardMarkup(keyboard, one_time_keyboard=True, resize_keyboard=True)
            
            await update.message.reply_text(
                "📅 *Follow-up Reminder*\n\n"
                "Would you like a reminder if no response is received?\n\n"
                "1 - Yes\n"
                "2 - No",
                reply_markup=reply_markup,
                parse_mode='Markdown'
            )
            
            return ASKING_REMINDER
        else:
            # Regular response
            await update.message.reply_text(response)
            
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        await update.message.reply_text(
            "Sorry, I encountered an error. Please try again."
        )
    
    return ConversationHandler.END


async def asking_reminder_response(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle reminder preference"""
    chat_id = update.effective_chat.id
    response = update.message.text.strip()
    
    if response.startswith('1') or response.lower() == 'yes':
        # User wants reminder
        await update.message.reply_text(
            "After how many days?\n"
            "(Default: 15 days)",
            reply_markup=ReplyKeyboardRemove()
        )
        return ASKING_DAYS
    else:
        # User doesn't want reminder
        await update.message.reply_text(
            "No reminder set. You can ask me anything else!",
            reply_markup=ReplyKeyboardRemove()
        )
        return ConversationHandler.END


async def asking_days_response(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle days input for reminder"""
    chat_id = update.effective_chat.id
    response = update.message.text.strip()
    
    # Parse days
    try:
        days = int(response)
        if days < 1 or days > 90:
            raise ValueError("Days must be between 1 and 90")
    except:
        days = 15  # Default
    
    # Get document context
    doc_context = user_document_context.get(chat_id, {})
    service_type = doc_context.get("document_type", "Document")
    
    # Create reminder
    await create_reminder(
        chat_id=chat_id,
        service_type=service_type,
        action_type=detect_action_type(service_type),
        days=days
    )
    
    reminder_date = datetime.utcnow() + timedelta(days=days)
    
    await update.message.reply_text(
        f"✅ *Reminder Set!*\n\n"
        f"I'll remind you about your {service_type} on "
        f"{reminder_date.strftime('%d %B %Y')}.\n\n"
        f"You can disable notifications anytime with /stop\\_notifications",
        parse_mode='Markdown'
    )
    
    # Clean up context
    if chat_id in user_document_context:
        del user_document_context[chat_id]
    
    return ConversationHandler.END


async def cancel_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Cancel conversation"""
    await update.message.reply_text(
        "Cancelled. You can ask me anything!",
        reply_markup=ReplyKeyboardRemove()
    )
    return ConversationHandler.END


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def is_generated_document(text: str) -> bool:
    """Check if text is a generated document"""
    indicators = [
        'to,',
        'subject:',
        'sir/madam',
        'yours faithfully',
        'thanking you',
        'application under',
        'grievance regarding'
    ]
    text_lower = text.lower()
    return any(indicator in text_lower for indicator in indicators) and len(text) > 200


def detect_document_type(text: str) -> str:
    """Detect document type from content"""
    text_lower = text.lower()
    
    if 'rti' in text_lower or 'right to information' in text_lower:
        return "RTI Application"
    elif 'complaint' in text_lower:
        return "Complaint Letter"
    elif 'grievance' in text_lower:
        return "Grievance"
    elif 'appeal' in text_lower:
        return "First Appeal"
    elif 'subject:' in text_lower and 'dear' in text_lower:
        return "Email Draft"
    else:
        return "Document"


def detect_action_type(document_type: str) -> str:
    """Detect action type from document type"""
    if "rti" in document_type.lower():
        return "rti"
    elif "complaint" in document_type.lower():
        return "complaint"
    else:
        return "document"


# ============================================================================
# MAIN BOT SETUP
# ============================================================================

def main():
    """Start the Telegram bot"""
    # Get bot token
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not bot_token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set in environment")
    
    # Create application
    application = Application.builder().token(bot_token).build()
    
    # Add command handlers
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("help", help_command))
    application.add_handler(CommandHandler("stop_notifications", stop_notifications_command))
    
    # Add conversation handler for document generation + reminder flow
    conv_handler = ConversationHandler(
        entry_points=[MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message)],
        states={
            ASKING_REMINDER: [MessageHandler(filters.TEXT & ~filters.COMMAND, asking_reminder_response)],
            ASKING_DAYS: [MessageHandler(filters.TEXT & ~filters.COMMAND, asking_days_response)],
        },
        fallbacks=[CommandHandler('cancel', cancel_handler)],
    )
    
    application.add_handler(conv_handler)
    
    # Start bot
    logger.info("🤖 RakshaAI Telegram Bot started!")
    application.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == '__main__':
    main()
