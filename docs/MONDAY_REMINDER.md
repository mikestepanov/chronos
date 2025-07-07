# Monday Morning Pay Period Reminder

Automated system for sending pay period reminders every other Monday at 7 AM CST when the pay period ends.

## Overview

The Monday reminder system automatically:
- Calculates the current pay period number (starting from period 18 ending June 23, 2025)
- Sends reminders on Monday mornings when Monday is the last day of the pay period
- Uses Agent Smith persona for formal business communication
- Updates dates and period numbers automatically
- Payments process 7 days later (the following Monday)

## Message Format

Agent Smith sends a formal reminder in his characteristic style:

```
🕴️ System Notice: Pay Period 19th Termination

Good Morning Team.

The current pay period cycle reaches its inevitable termination today.

System Requirements:
• Submit all temporal data by end of day today (July 7th)
• Current cycle encompasses: 6/24 – 7/7
• Today (July 7th) is the final day of period 19
• Tomorrow (July 8th) initiates period 20

Additional Directives:
• Those assigned supplementary hours must include them in current submissions
• All entries require proper documentation and categorization

Processing Timeline:
• Payment transmission scheduled: July 14th
• System processing is automatic and inevitable

Compliance is not optional. Direct queries to management if clarification is required.

~ Agent Smith
```

## Usage

### Manual Commands

```bash
# Send reminder (only works on last day of period)
npm run monday

# Send test reminder (bypasses date check)
npm run monday:test

# Preview message for specific date
npm run monday:preview
node monday-reminder.js preview 2024-07-07

# Show next 10 pay periods
npm run monday:schedule
node monday-reminder.js schedule 10
```

### Automated Scheduling

The GitHub Action runs every Monday at 7 AM CST:
- Automatically checks if it's the last day of a pay period
- Only sends message when appropriate
- Can be manually triggered with test mode

## Pay Period Schedule

Starting from Period 18 (June 10-23, 2025):

| Period | Start Date | End Date (Monday) | Payment Date (Monday) |
|--------|------------|-------------------|-----------------------|
| 18     | Jun 10     | Jun 23           | Jun 30                |
| 19     | Jun 24     | Jul 7            | Jul 14                |
| 20     | Jul 8      | Jul 21           | Jul 28                |
| 21     | Jul 22     | Aug 4            | Aug 11                |
| 22     | Aug 5      | Aug 18           | Aug 25                |

## Configuration

### Environment Variables

```env
# Use Agent Smith for formal Monday reminders
BOT_IDENTITY=agentsmith

# Agent Smith credentials
AGENTSMITH_EMAIL=agentsmith@company.com
AGENTSMITH_ID=agent-smith-pumble-id
AGENTSMITH_API_KEY=agent-smith-api-key

# Channel IDs
DEV_CHANNEL_ID=C-dev-channel-id
DESIGN_CHANNEL_ID=C-design-channel-id
```

### GitHub Actions Secrets

Add these secrets to your repository:
- All Agent Smith credentials
- Channel IDs for dev and design teams
- `MESSAGING_PLATFORM=pumble`

## Testing

### Preview Next Monday's Message
```bash
# If today is Thursday, July 4, 2024
node monday-reminder.js preview 2024-07-07

# Output shows:
# - Full formatted message
# - Period 19 details
# - Confirms it's the last day of period
```

### Check Future Pay Periods
```bash
node monday-reminder.js schedule 5

# Shows next 5 pay periods with:
# - Period numbers
# - Date ranges
# - Payment dates
# - Which Monday is the last day
```

## How It Works

1. **Base Reference**: Period 18 ends on June 23, 2025 (Monday)
2. **Calculation**: System calculates current period based on 14-day cycles
3. **Date Check**: Only sends on Mondays that are the last day of a period
4. **Auto-increment**: Period numbers and dates update automatically
5. **Payment Date**: Always 7 days after period end (the following Monday)

## Bot Personality

Agent Smith was chosen for Monday reminders because:
- Formal, business-appropriate tone
- Systematic approach matches payroll process
- Clear, direct communication style
- Emphasizes inevitability and compliance

His messages maintain professionalism while adding character through:
- "System Notice" framing
- "Temporal data" for timesheets
- "Inevitable conclusion" for deadlines
- "Compliance is not optional" for requirements