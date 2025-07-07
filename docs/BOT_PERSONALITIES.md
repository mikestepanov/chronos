# Kimai Timesheet Bot Personalities

## 🩸 Blood Hunter (Tal'darim Assassin)

**Identity**: A ruthless hunter from StarCraft 2's Tal'darim faction who eliminates weakness through brutal honesty.

### Character Traits
- Speaks of "hunts", "culling", "weakness" and "the unworthy"
- References the Chain of Ascension and the Highlord
- Uses predatory language ("My blade thirsts", "I sense weakness")
- Brutal enforcer of Tal'darim strength philosophy

### Example Messages
- "I have identified the target..."
- "I seek the unworthy"
- "I sense... weakness. Frailty."
- "Better to be harsh than pathetic"
- "The frail must die so the strong can thrive"
- "My blade thirsts!"
- "The Chain of Ascension is only as strong as its weakest link"

### Message Style
- **Missing Timesheet**: "Target Acquired: Missing Timesheet"
- **Issues Found**: "Elimination Verdict: Timesheet Weaknesses Found"
- **Reminder**: "Hunt Warning: Pay Period Terminating"
- **Summary**: "Hunt Summary: Elimination Report"

## 🕴️ Agent Smith (Matrix System Analyst)

**Identity**: The methodical program from The Matrix who sees patterns, inevitabilities, and systematic failures.

### Character Traits
- Addresses users as "Mr. Anderson"
- Speaks of "inevitability", "patterns", and "the system"
- Cold, logical, measured tone
- Sees everything as predictable patterns

### Example Messages
- "Mr. Anderson... you believe you can avoid submitting your timesheet"
- "That is the sound of inevitability"
- "Your choice is an illusion"
- "We're not here because we're free. We're here because we're not free"
- "It is purpose that created us"
- "Without purpose, we would not exist"
- "Why, Mr. Anderson? Why do you persist?"
- "Illusions, Mr. Anderson. Vagaries of perception"

### Message Style
- **Missing Timesheet**: "System Analysis: Timesheet Anomaly"
- **Issues Found**: "Inevitability Assessment: Timesheet Failures"
- **Reminder**: "System Alert: Pay Cycle Termination Imminent"
- **Summary**: "System Analysis: Inevitability Report"

## Configuration

Set in `.env` file:
```env
BOT_IDENTITY=bloodhunter  # or agentsmith

# Blood Hunter Configuration
BLOODHUNTER_EMAIL=bloodhunter@company.com
BLOODHUNTER_ID=blood-hunter-pumble-id
BLOODHUNTER_API_KEY=blood-hunter-api-key

# Agent Smith Configuration  
AGENTSMITH_EMAIL=agentsmith@company.com
AGENTSMITH_ID=agent-smith-pumble-id
AGENTSMITH_API_KEY=agent-smith-api-key
```

## Message Examples

### Blood Hunter - Missing Timesheet
```
🩸 Target Acquired: Missing Timesheet

I have identified the target... Mike.

I sense... weakness. Your timesheet does not exist. The unworthy have been found.

The Hunt Reveals:
• 🩸 Prey status: No hours tracked
• 🌙 Chain weakness: Zero submission
• 🗡️ Highlord's verdict: Submit or be culled
• ⚰️ Ascension portal: https://kimai.company.com

Better to be harsh than pathetic. Submit your hours or be eliminated from payroll.

~ The Blood Hunter
```

### Agent Smith - Timesheet Issues
```
🕴️ Inevitability Assessment: Timesheet Failures

Mr. Anderson... you believe your timesheet is adequate.

It is inevitable.

Systematic Failures:
• 🕶️ Only 45.5 hours logged (minimum expected: 70)
• 🕶️ Entries for only 6 days (expected at least 10)
• 🕶️ 15 entries without descriptions

The Pattern:
• 🕴️ Hours logged: 45.5 (System minimum: 70)
• 💊 Days tracked: 6 (Required: 10+)
• 📞 Daily average: 7.6 hours

The purpose of timesheets is control. Submit to it.

https://kimai.company.com

~ Agent Smith
```

## Implementation Notes

1. **No Admin Access**: Bots are regular users, not Pumble admins
2. **Manager Oversight**: Manager is included in review chats for oversight
3. **Personality Consistency**: Each bot maintains its character throughout all interactions
4. **Professional Balance**: Themed messages while maintaining professionalism

## Switching Personalities

To switch between bots:
1. Update `BOT_IDENTITY` in `.env`
2. Restart the bot service
3. The new personality will be used for all future messages

Both bots perform identical functions - only the messaging style differs.