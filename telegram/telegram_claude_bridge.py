#!/usr/bin/env python3
"""
Telegram bot that bridges messages to Claude Code CLI
Allows sending coding requests from phone to Claude Code on your computer
"""

import os
import subprocess
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
import asyncio
from datetime import datetime

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
TELEGRAM_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
ALLOWED_USERS = os.getenv('ALLOWED_TELEGRAM_USERS', '').split(',')  # Comma-separated user IDs
CLAUDE_CODE_PATH = 'claude'  # Assuming claude is in PATH
WORKING_DIR = os.path.expanduser('~/Documents/GitHub/omega')  # Your project directory

class ClaudeCodeBridge:
    def __init__(self):
        self.active_sessions = {}
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Send a message when the command /start is issued."""
        user_id = str(update.effective_user.id)
        
        # Check if user is authorized
        if ALLOWED_USERS and user_id not in ALLOWED_USERS:
            await update.message.reply_text("Unauthorized access. Contact admin to get access.")
            return
            
        await update.message.reply_text(
            "🤖 Claude Code Bridge Active!\n\n"
            "Send me any coding request and I'll execute it through Claude Code.\n"
            "Commands:\n"
            "/start - Start the bot\n"
            "/clear - Clear conversation context\n"
            "/status - Check Claude Code status\n\n"
            "Just type your request and I'll handle it!"
        )
    
    async def clear(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Clear the conversation context."""
        user_id = str(update.effective_user.id)
        if user_id in self.active_sessions:
            del self.active_sessions[user_id]
        await update.message.reply_text("✅ Conversation context cleared!")
    
    async def status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Check Claude Code status."""
        try:
            # Test if claude command exists
            result = subprocess.run(['which', CLAUDE_CODE_PATH], capture_output=True, text=True)
            if result.returncode == 0:
                await update.message.reply_text(
                    f"✅ Claude Code is available at: {result.stdout.strip()}\n"
                    f"📁 Working directory: {WORKING_DIR}"
                )
            else:
                await update.message.reply_text("❌ Claude Code not found in PATH!")
        except Exception as e:
            await update.message.reply_text(f"❌ Error checking status: {str(e)}")
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Handle incoming messages and send to Claude Code."""
        user_id = str(update.effective_user.id)
        
        # Check authorization
        if ALLOWED_USERS and user_id not in ALLOWED_USERS:
            await update.message.reply_text("Unauthorized access.")
            return
        
        message = update.message.text
        logger.info(f"Received from {user_id}: {message}")
        
        # Send typing indicator
        await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")
        
        try:
            # Execute Claude Code with the message
            await update.message.reply_text("🔄 Processing with Claude Code...")
            
            # Run claude command
            cmd = [CLAUDE_CODE_PATH, message]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=WORKING_DIR
            )
            
            stdout, stderr = await process.communicate()
            
            # Format response
            if process.returncode == 0:
                response = stdout.decode('utf-8')
                
                # Split long messages
                if len(response) > 4000:
                    chunks = [response[i:i+4000] for i in range(0, len(response), 4000)]
                    for i, chunk in enumerate(chunks):
                        await update.message.reply_text(
                            f"📝 Response ({i+1}/{len(chunks)}):\n```\n{chunk}\n```",
                            parse_mode='Markdown'
                        )
                else:
                    await update.message.reply_text(
                        f"✅ Claude Code response:\n```\n{response}\n```",
                        parse_mode='Markdown'
                    )
            else:
                error_msg = stderr.decode('utf-8') if stderr else "Unknown error"
                await update.message.reply_text(
                    f"❌ Error executing Claude Code:\n```\n{error_msg}\n```",
                    parse_mode='Markdown'
                )
                
        except Exception as e:
            logger.error(f"Error handling message: {str(e)}")
            await update.message.reply_text(f"❌ Error: {str(e)}")

def main():
    """Start the bot."""
    bridge = ClaudeCodeBridge()
    
    # Create the Application
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    # Register handlers
    application.add_handler(CommandHandler("start", bridge.start))
    application.add_handler(CommandHandler("clear", bridge.clear))
    application.add_handler(CommandHandler("status", bridge.status))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, bridge.handle_message))
    
    # Run the bot
    logger.info("Starting Telegram Claude Code Bridge...")
    application.run_polling()

if __name__ == '__main__':
    main()