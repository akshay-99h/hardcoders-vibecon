"""
Quick test script for Telegram bot setup
"""
import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

load_dotenv('/app/backend/.env')

def test_environment():
    """Test environment variables"""
    print("🧪 Testing Telegram Bot Environment\n")
    
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "raksha_ai")
    
    print(f"✓ TELEGRAM_BOT_TOKEN: {'Set' if bot_token else '❌ NOT SET'}")
    print(f"✓ MONGO_URL: {'Set' if mongo_url else '❌ NOT SET'}")
    print(f"✓ DB_NAME: {db_name}")
    
    if not bot_token:
        print("\n❌ TELEGRAM_BOT_TOKEN not found!")
        print("\nTo set up:")
        print("1. Open Telegram and search for @BotFather")
        print("2. Send /newbot and follow instructions")
        print("3. Copy the token")
        print("4. Add to /app/backend/.env:")
        print("   TELEGRAM_BOT_TOKEN=your_token_here")
        return False
    
    if not mongo_url:
        print("\n❌ MONGO_URL not found!")
        return False
    
    print("\n✅ Environment configured correctly!")
    return True


async def test_database():
    """Test database connection"""
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.getenv("MONGO_URL")
    db_name = os.getenv("DB_NAME", "raksha_ai")
    
    print("\n🔍 Testing Database Connection...")
    
    try:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
        
        # Try to count documents
        user_count = await db.telegram_users.count_documents({})
        reminder_count = await db.telegram_reminders.count_documents({})
        
        print(f"✅ Connected to MongoDB")
        print(f"   Users: {user_count}")
        print(f"   Reminders: {reminder_count}")
        
        return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


async def test_telegram_bot():
    """Test Telegram bot token"""
    from telegram import Bot
    
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    
    if not bot_token:
        print("\n❌ Cannot test bot - token not set")
        return False
    
    print("\n🤖 Testing Telegram Bot Token...")
    
    try:
        bot = Bot(token=bot_token)
        me = await bot.get_me()
        
        print(f"✅ Bot connected successfully!")
        print(f"   Bot Name: @{me.username}")
        print(f"   Bot ID: {me.id}")
        print(f"   First Name: {me.first_name}")
        
        return True
    except Exception as e:
        print(f"❌ Bot connection failed: {e}")
        return False


async def run_all_tests():
    """Run all tests"""
    print("=" * 50)
    print("RakshaAI Telegram Bot - Setup Test")
    print("=" * 50)
    
    # Test environment
    if not test_environment():
        return
    
    # Test database
    if not await test_database():
        return
    
    # Test bot
    if not await test_telegram_bot():
        return
    
    print("\n" + "=" * 50)
    print("✅ ALL TESTS PASSED!")
    print("=" * 50)
    print("\n📝 Next steps:")
    print("1. Run the bot: python bot.py")
    print("2. Run the scheduler: python scheduler.py")
    print("3. Or use supervisor (see README.md)")


if __name__ == '__main__':
    import asyncio
    asyncio.run(run_all_tests())
