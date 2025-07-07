# Bot Email Accounts Setup

## Required Bot Accounts

### 1. Agent Smith Bot ✅ ACTIVE
- **Email**: `agent.smith.starthub@gmail.com`
- **Purpose**: Monday morning pay period reminders
- **Used for**:
  - Sending scheduled reminders to dev/design channels
  - Formal business communications
  - Pay period announcements every other Monday at 7 AM CST

### 2. Blood Hunter Bot ⏸️ ARCHIVED
- **Status**: Not currently active - archived for future use
- **Purpose**: Kimai timesheet monitoring and enforcement
- **Would be used for**: 
  - Sending direct messages about missing timesheets
  - Creating group chats with employees
  - Harsh enforcement messages

## Gmail Account Creation Steps

1. **Create Gmail accounts**:
   - Go to https://accounts.google.com/signup
   - Create account for Blood Hunter
   - Create account for Agent Smith
   - Enable 2FA for security

2. **Set up Pumble accounts**:
   - Invite bot emails to your Pumble workspace
   - Accept invitations from bot Gmail accounts
   - Note down the Pumble user IDs for each bot

3. **Generate Pumble API keys**:
   - Log into Pumble as each bot
   - Go to Settings → API → Generate API Key
   - Save API keys securely

## Information Needed

Once you create the accounts, please provide:

### Agent Smith Bot (ACTIVE):
```
AGENTSMITH_EMAIL=agent.smith.starthub@gmail.com  
AGENTSMITH_ID=[Get from Pumble profile URL after inviting]
AGENTSMITH_API_KEY=[Generate in Pumble settings]
```

### Blood Hunter Bot (ARCHIVED - not needed now):
```
# BLOODHUNTER_EMAIL=TBD
# BLOODHUNTER_ID=TBD
# BLOODHUNTER_API_KEY=TBD
```

### Channel IDs:
```
DEV_CHANNEL_ID=[Dev channel ID from Pumble]
DESIGN_CHANNEL_ID=[Design channel ID from Pumble]
```

### Mikhail's Info (for timesheet issue chats):
```
MIKHAIL_EMAIL=mikhail@starthub.academy
MIKHAIL_PUMBLE_ID=66908542f1798a06218c1fc5
```

## Getting Pumble IDs

### User IDs (Method 1 - Profile):
1. In Pumble web/desktop app, click on your profile picture
2. Click "View profile" or "Profile"
3. Check the URL - your ID is the last part after `/profile/`
   Example: `.../profile/66908542f1798a06218c1fc5` ← This is your user ID
4. User IDs are typically 24-character hex strings

### User IDs (Method 2 - Developer Console):
1. Open Pumble in your browser
2. Press F12 to open Developer Tools
3. Go to Network tab
4. Send a message or refresh
5. Look for API calls - your user ID will be in the responses

### User IDs (Method 3 - API):
```bash
# If you have a Pumble API key:
curl -H "Api-Key: YOUR_API_KEY" https://api.pumble.com/v1/users
```

### Channel IDs:
1. Open the channel in Pumble
2. Check the URL - channel ID is in the middle:
   Example: `.../workspace/[workspace_id]/66934de10aeebd36fe26f468/profile/...`
   The channel ID is: `66934de10aeebd36fe26f468`
3. Channel IDs are 24-character hex strings (like user IDs)
4. Alternative: Right-click channel → "Copy Channel ID" (if available)

## Security Notes

- Use strong, unique passwords for bot accounts
- Enable 2FA on Gmail accounts
- Store API keys securely (never commit to git)
- Rotate API keys periodically
- Consider using a password manager

## Next Steps

After creating accounts and getting all IDs:

1. **For local testing**, create `.env` file:
```bash
cd scripts
cp .env.example .env
# Edit .env with your values
```

2. **For GitHub Actions**, add secrets:
- Go to repo Settings → Secrets → Actions
- Add each value as a secret

3. **Test the setup**:
```bash
# Test Blood Hunter (timesheet monitor)
node kimai-monitor.js test

# Test Agent Smith (Monday reminder)
node monday-reminder.js preview
```