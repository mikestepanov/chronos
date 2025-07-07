#!/usr/bin/env python3
"""
Cloud-based Telegram bot for Claude Code execution
Supports multiple backends: local PC, cloud servers, GitHub Codespaces
Uses Redis queue for async processing across multiple workers
"""

import os
import json
import redis
import logging
import asyncio
import subprocess
from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# Configuration
TELEGRAM_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')  # For cloud deployment
ALLOWED_USERS = os.getenv('ALLOWED_TELEGRAM_USERS', '').split(',')

class ExecutorType(Enum):
    LOCAL = "local"
    CLOUD_SERVER = "cloud_server"
    GITHUB_CODESPACES = "github_codespaces"
    REPLIT = "replit"

class ClaudeCloudBridge:
    def __init__(self):
        self.redis_client = redis.from_url(REDIS_URL)
        self.executor_status = {}
        
    async def start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Initialize bot and show available executors."""
        user_id = str(update.effective_user.id)
        
        if ALLOWED_USERS and user_id not in ALLOWED_USERS:
            await update.message.reply_text("Unauthorized access.")
            return
            
        # Check available executors
        executors = self._get_available_executors()
        
        await update.message.reply_text(
            "🌐 Claude Code Cloud Bridge\n\n"
            "Send coding requests from anywhere!\n\n"
            "Commands:\n"
            "/executors - List available execution backends\n"
            "/queue - Check queue status\n"
            "/cancel <job_id> - Cancel a job\n\n"
            f"Available executors: {', '.join(executors)}"
        )
    
    async def list_executors(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """List all available execution backends."""
        executors = []
        
        # Check local
        if self._check_local_claude():
            executors.append("💻 Local PC (online)")
        
        # Check cloud servers
        cloud_status = self._check_cloud_servers()
        for server, status in cloud_status.items():
            executors.append(f"☁️ {server}: {'🟢 online' if status else '🔴 offline'}")
        
        await update.message.reply_text(
            "🔧 Available Executors:\n\n" + "\n".join(executors) or "❌ No executors available"
        )
    
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Queue message for processing by available executor."""
        user_id = str(update.effective_user.id)
        
        if ALLOWED_USERS and user_id not in ALLOWED_USERS:
            return
            
        message = update.message.text
        
        # Check available workers
        workers = list(self.redis_client.smembers('workers'))
        worker_count = len(workers)
        
        # Create job
        job_id = f"job_{user_id}_{datetime.now().timestamp()}"
        job_data = {
            "id": job_id,
            "user_id": user_id,
            "chat_id": update.effective_chat.id,
            "message": message,
            "status": "queued",
            "created_at": datetime.now().isoformat()
        }
        
        # Add to queue
        self.redis_client.lpush("claude_jobs", json.dumps(job_data))
        self.redis_client.set(f"job:{job_id}", json.dumps(job_data))
        
        # Show worker info
        worker_info = ""
        if worker_count > 0:
            worker_names = [w.decode() if isinstance(w, bytes) else w for w in workers]
            worker_info = f"\n🖥️ Available workers: {', '.join(worker_names)}"
        else:
            worker_info = "\n⚠️ No workers online! Job will process when a worker comes online."
        
        await update.message.reply_text(
            f"📋 Job queued!\n"
            f"ID: `{job_id}`\n"
            f"Position in queue: {self.redis_client.llen('claude_jobs')}"
            f"{worker_info}",
            parse_mode='Markdown'
        )
    
    async def check_queue(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Check queue status."""
        queue_length = self.redis_client.llen('claude_jobs')
        
        # Get worker status
        workers = list(self.redis_client.smembers('workers'))
        worker_details = []
        for worker in workers:
            worker_name = worker.decode() if isinstance(worker, bytes) else worker
            worker_status = self.redis_client.get(f'worker:{worker_name}:status')
            if worker_status:
                worker_details.append(f"🟢 {worker_name}")
        
        # Get active jobs
        active_jobs = []
        for key in self.redis_client.scan_iter("job:*"):
            job_data = json.loads(self.redis_client.get(key))
            if job_data['status'] in ['processing', 'queued']:
                active_jobs.append(job_data)
        
        status_msg = f"📊 System Status:\n\n"
        status_msg += f"🖥️ **Workers Online: {len(workers)}**\n"
        if worker_details:
            status_msg += "\n".join(worker_details) + "\n\n"
        
        status_msg += f"📋 **Queue Status:**\n"
        status_msg += f"• Queued: {queue_length}\n"
        status_msg += f"• Processing: {len([j for j in active_jobs if j['status'] == 'processing'])}\n\n"
        
        if active_jobs:
            status_msg += "**Active Jobs:**\n"
            for job in active_jobs[:5]:
                worker_info = f" on {job.get('worker', 'pending')}" if job.get('worker') else ""
                status_msg += f"• {job['status']}{worker_info}\n"
        
        await update.message.reply_text(status_msg, parse_mode='Markdown')
    
    def _get_available_executors(self) -> list:
        """Get list of available executors."""
        executors = []
        
        if self._check_local_claude():
            executors.append("local")
            
        # Add cloud executors
        cloud_status = self._check_cloud_servers()
        executors.extend([s for s, online in cloud_status.items() if online])
        
        return executors
    
    def _check_local_claude(self) -> bool:
        """Check if local Claude Code is available."""
        try:
            result = subprocess.run(['which', 'claude'], capture_output=True)
            return result.returncode == 0
        except:
            return False
    
    def _check_cloud_servers(self) -> Dict[str, bool]:
        """Check status of cloud servers."""
        servers = {}
        
        # Check GitHub Codespaces
        codespace_url = os.getenv('GITHUB_CODESPACE_URL')
        if codespace_url:
            servers['GitHub Codespaces'] = self._ping_server(codespace_url)
        
        # Check Replit
        replit_url = os.getenv('REPLIT_URL')
        if replit_url:
            servers['Replit'] = self._ping_server(replit_url)
            
        # Check custom servers
        for i in range(1, 4):
            server_url = os.getenv(f'CLAUDE_SERVER_{i}_URL')
            if server_url:
                servers[f'Server {i}'] = self._ping_server(server_url)
                
        return servers
    
    def _ping_server(self, url: str) -> bool:
        """Ping a server to check if it's online."""
        try:
            import requests
            response = requests.get(f"{url}/health", timeout=5)
            return response.status_code == 200
        except:
            return False

def main():
    """Start the bot."""
    bridge = ClaudeCloudBridge()
    application = Application.builder().token(TELEGRAM_TOKEN).build()
    
    # Register handlers
    application.add_handler(CommandHandler("start", bridge.start))
    application.add_handler(CommandHandler("executors", bridge.list_executors))
    application.add_handler(CommandHandler("queue", bridge.check_queue))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, bridge.handle_message))
    
    # Use webhook if URL provided (for cloud deployment)
    if WEBHOOK_URL:
        application.run_webhook(
            listen="0.0.0.0",
            port=int(os.environ.get("PORT", 8443)),
            url_path=TELEGRAM_TOKEN,
            webhook_url=f"{WEBHOOK_URL}/{TELEGRAM_TOKEN}"
        )
    else:
        application.run_polling()

if __name__ == '__main__':
    main()