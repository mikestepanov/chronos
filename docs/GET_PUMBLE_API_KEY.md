# How to Get Agent Smith API Key

## Steps to Generate API Key:

1. **Log into Pumble** as the Agent Smith bot account:
   - Email: `agent.smith.starthub@gmail.com`
   - You'll need the password for this account

2. **Generate API Key** in Pumble:
   - In any Pumble channel or DM, type: `/api-keys generate`
   - Give it a descriptive name like "Agent Smith Bot"
   - Copy the generated API key immediately (you won't be able to see it again)

3. **Update .env file**:
   ```bash
   # Replace this line:
   AGENTSMITH_API_KEY=YOUR_AGENTSMITH_API_KEY_HERE
   
   # With:
   AGENTSMITH_API_KEY=your-actual-api-key-here
   ```

## Alternative: Use Your Personal Account

If you don't have access to the Agent Smith account, you can:

1. Generate an API key from your own Pumble account (`mikhail@starthub.academy`)
2. Update the `.env` to use your personal API key
3. Messages will be sent as you, not as Agent Smith

## Testing the API Key

Once you have the API key, test it:

```bash
# Set the API key in .env first, then:
node bots/kimai/integrations/test-pumble-connection.js
```

This will verify that the API key works and can send messages.