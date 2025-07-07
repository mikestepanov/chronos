#!/usr/bin/env python3
"""
Worker process that pulls jobs from Redis queue and executes Claude Code
Can run on any machine with Claude Code installed
"""

import os
import json
import redis
import subprocess
import logging
import time
import asyncio
from datetime import datetime
from telegram import Bot

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
TELEGRAM_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN', 'YOUR_BOT_TOKEN_HERE')
WORKER_ID = os.getenv('WORKER_ID', f'worker_{os.uname().nodename}')
CLAUDE_TIMEOUT = int(os.getenv('CLAUDE_TIMEOUT', '300'))  # 5 minutes

class ClaudeWorker:
    def __init__(self):
        self.redis_client = redis.from_url(REDIS_URL)
        self.bot = Bot(token=TELEGRAM_TOKEN)
        self.running = True
        
    async def run(self):
        """Main worker loop."""
        logger.info(f"Starting worker {WORKER_ID}")
        
        # Register worker
        self.redis_client.sadd('workers', WORKER_ID)
        self.redis_client.set(f'worker:{WORKER_ID}:status', 'online')
        
        try:
            while self.running:
                # Get job from queue (blocking)
                job_data = self.redis_client.brpop('claude_jobs', timeout=5)
                
                if job_data:
                    _, job_json = job_data
                    job = json.loads(job_json)
                    await self.process_job(job)
                else:
                    # Heartbeat
                    self.redis_client.expire(f'worker:{WORKER_ID}:status', 30)
                    
        except KeyboardInterrupt:
            logger.info("Worker shutting down...")
        finally:
            # Cleanup
            self.redis_client.srem('workers', WORKER_ID)
            self.redis_client.delete(f'worker:{WORKER_ID}:status')
    
    async def process_job(self, job: dict):
        """Process a single job."""
        job_id = job['id']
        logger.info(f"Processing job {job_id}")
        
        # Update job status
        job['status'] = 'processing'
        job['worker'] = WORKER_ID
        job['started_at'] = datetime.now().isoformat()
        self.redis_client.set(f"job:{job_id}", json.dumps(job))
        
        # Notify user with worker details
        worker_info = {
            'id': WORKER_ID,
            'hostname': os.uname().nodename,
            'platform': os.uname().sysname,
            'location': os.getenv('WORKER_LOCATION', 'Unknown')
        }
        
        await self.bot.send_message(
            chat_id=job['chat_id'],
            text=f"🔄 Processing your request...\n"
                 f"👷 Worker: {worker_info['id']}\n"
                 f"🖥️ Host: {worker_info['hostname']}\n"
                 f"📍 Location: {worker_info['location']}"
        )
        
        try:
            # Execute Claude Code
            result = await self.execute_claude(job['message'])
            
            # Send results
            if result['success']:
                # Split long messages
                output = result['output']
                if len(output) > 4000:
                    chunks = [output[i:i+4000] for i in range(0, len(output), 4000)]
                    for i, chunk in enumerate(chunks):
                        await self.bot.send_message(
                            chat_id=job['chat_id'],
                            text=f"✅ Result ({i+1}/{len(chunks)}):\n```\n{chunk}\n```",
                            parse_mode='Markdown'
                        )
                else:
                    await self.bot.send_message(
                        chat_id=job['chat_id'],
                        text=f"✅ Result:\n```\n{output}\n```",
                        parse_mode='Markdown'
                    )
            else:
                await self.bot.send_message(
                    chat_id=job['chat_id'],
                    text=f"❌ Error:\n```\n{result['error']}\n```",
                    parse_mode='Markdown'
                )
            
            # Update job status
            job['status'] = 'completed' if result['success'] else 'failed'
            job['completed_at'] = datetime.now().isoformat()
            job['result'] = result
            self.redis_client.set(f"job:{job_id}", json.dumps(job))
            
        except Exception as e:
            logger.error(f"Error processing job {job_id}: {str(e)}")
            await self.bot.send_message(
                chat_id=job['chat_id'],
                text=f"❌ Worker error: {str(e)}"
            )
            
            job['status'] = 'failed'
            job['error'] = str(e)
            self.redis_client.set(f"job:{job_id}", json.dumps(job))
    
    async def execute_claude(self, message: str) -> dict:
        """Execute Claude Code command."""
        try:
            # Run claude command with timeout
            process = await asyncio.create_subprocess_exec(
                'claude', message,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=os.path.expanduser('~/projects')  # Default working directory
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=CLAUDE_TIMEOUT
                )
                
                if process.returncode == 0:
                    return {
                        'success': True,
                        'output': stdout.decode('utf-8')
                    }
                else:
                    return {
                        'success': False,
                        'error': stderr.decode('utf-8') or 'Unknown error'
                    }
                    
            except asyncio.TimeoutError:
                process.kill()
                return {
                    'success': False,
                    'error': f'Command timed out after {CLAUDE_TIMEOUT} seconds'
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

async def main():
    worker = ClaudeWorker()
    await worker.run()

if __name__ == '__main__':
    asyncio.run(main())