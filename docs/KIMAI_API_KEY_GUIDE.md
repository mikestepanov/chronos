# How to Get Your Kimai API Key

## Steps to Generate API Token

1. **Log into Kimai**
   - Go to https://kimai.starthub.academy
   - Sign in with your account

2. **Access Your Profile**
   - Click on your user profile (username/avatar in top right)
   - Select "API Access" from the menu

3. **Create API Token**
   - Click "Create API Token" or similar button
   - Give it a descriptive name like "Bot Access" or "Pumble Integration"

4. **Copy the Token Immediately**
   - **IMPORTANT**: The token is shown only once when you create it!
   - Copy it right away
   - Store it securely

## Using the API Token

The token should be used in API requests with the Authorization header:
```
Authorization: Bearer YOUR_API_TOKEN
```

Or in some cases as:
```
X-AUTH-TOKEN: YOUR_API_TOKEN
```

## Alternative: Password Authentication

If API keys aren't available in your Kimai version, you can use username/password:

```env
KIMAI_USERNAME=bot@starthub.academy
KIMAI_PASSWORD=your-bot-password
```

## Testing Your API Key

Once you have the key, test it:

```bash
curl -X GET https://kimai.starthub.academy/api/version \
  -H "X-AUTH-TOKEN: your-api-key-here"
```

Should return version info if the key works.

## Common Issues

1. **Can't find API section**: 
   - Check under User preferences
   - Look for "Security" or "Access tokens"
   - May need admin privileges

2. **API disabled**:
   - Contact your Kimai administrator
   - API access might need to be enabled in system settings

3. **Permissions error**:
   - Ensure the API token has required permissions
   - For the bot, it needs at least read access to timesheets and users

## For Bot Account

If creating a dedicated bot account:

1. Create a new user in Kimai admin panel
2. Give it a role like "Teamlead" or custom role with:
   - View all timesheets
   - View all users
   - No edit permissions (read-only)
3. Log in as that user and generate API key