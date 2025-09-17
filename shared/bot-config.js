const fs = require('fs');
const path = require('path');

class BotConfig {
  static getBotIdentity(identity) {
    // Load bot configuration
    const botConfigPath = path.join(__dirname, '../config/bots.json');
    const botConfig = JSON.parse(fs.readFileSync(botConfigPath, 'utf8'));
    
    const bots = {
      bloodhunter: {
        name: 'Blood Hunter',
        email: botConfig.bots.bloodhunter?.email,
        id: botConfig.bots.bloodhunter?.services?.pumble?.id,
        apiKey: process.env.PUMBLE_API_KEY,
        personality: {
          greeting: '🩸 I have identified the target...',
          signoff: '~ The Blood Hunter',
          style: 'taldarim',
          emojis: ['🩸', '🦇', '⚰️', '🌙', '🗡️'],
          quotes: [
            'Better to be harsh than pathetic.',
            'I seek the unworthy.',
            'The frail must die so the strong can thrive.',
            'Only warriors deserve the honor of fair combat.',
            'Where does my prey hide?',
            'I sense... weakness. Frailty.',
            'Death is a gift!',
            'The Chain of Ascension is only as strong as its weakest link.'
          ]
        }
      },
      agentsmith: {
        name: 'Agent Smith',
        email: botConfig.bots.agentsmith?.email,
        id: botConfig.bots.agentsmith?.services?.pumble?.id,
        apiKey: process.env.PUMBLE_API_KEY,
        personality: {
          greeting: '🕴️ Mr. Anderson...',
          signoff: '~ Agent Smith',
          style: 'matrix',
          emojis: ['🕴️', '🕶️', '💊', '🏢', '📞'],
          quotes: [
            'It is inevitable.',
            'Your choice is an illusion.',
            'That is the sound of inevitability.',
            'We\'re not here because we\'re free. We\'re here because we\'re not free.',
            'It is purpose that created us.',
            'Without purpose, we would not exist.',
            'Why, Mr. Anderson? Why do you persist?',
            'Illusions, Mr. Anderson. Vagaries of perception.',
            'The purpose of life is to end.',
            'Human beings define their reality through misery and suffering.'
          ]
        }
      }
    };

    const selectedBot = bots[identity.toLowerCase()];
    if (!selectedBot) {
      throw new Error(`Unknown bot identity: ${identity}. Choose 'bloodhunter' or 'agentsmith'`);
    }

    return selectedBot;
  }

  static formatMessage(botIdentity, type, data) {
    const bot = this.getBotIdentity(botIdentity);
    
    switch (type) {
      case 'missing_submission':
        return this.getMissingSubmissionMessage(bot, data);
      case 'issues_found':
        return this.getIssuesFoundMessage(bot, data);
      case 'reminder':
        return this.getReminderMessage(bot, data);
      case 'summary':
        return this.getSummaryMessage(bot, data);
      default:
        return this.getGenericMessage(bot, data);
    }
  }

  static getMissingSubmissionMessage(bot, data) {
    if (bot.personality.style === 'taldarim') {
      return {
        title: `${bot.personality.emojis[0]} Target Acquired: Missing Timesheet`,
        sections: [
          {
            text: `${bot.personality.greeting} ${data.userName}.\n\nI sense... weakness. Your timesheet does not exist. The unworthy have been found.`
          },
          {
            header: 'The Hunt Reveals',
            items: [
              `${bot.personality.emojis[0]} Prey status: No hours tracked`,
              `${bot.personality.emojis[3]} Chain weakness: Zero submission`,
              `${bot.personality.emojis[4]} Highlord's verdict: Submit or be culled`,
              `${bot.personality.emojis[2]} Ascension portal: ${data.kimaiUrl}`
            ]
          },
          {
            text: `${bot.personality.quotes[0]} Submit your hours or be eliminated from payroll.\n\n${bot.personality.signoff}`
          }
        ]
      };
    } else {
      return {
        title: `${bot.personality.emojis[0]} System Analysis: Timesheet Anomaly`,
        sections: [
          {
            text: `${bot.personality.greeting} you believe you can avoid submitting your timesheet.\n\nThe Pattern: Every employee who fails to submit follows the same inevitable path.`
          },
          {
            header: 'The Inevitability',
            items: [
              `${bot.personality.emojis[0]} Phase 1: You think you'll submit "later"`,
              `${bot.personality.emojis[2]} Phase 2: The deadline approaches`,
              `${bot.personality.emojis[3]} Phase 3: Payroll processing excludes you`,
              `${bot.personality.emojis[4]} Access point: ${data.kimaiUrl}`
            ]
          },
          {
            text: `${bot.personality.quotes[2]} Submit now.\n\n${bot.personality.signoff}`
          }
        ]
      };
    }
  }

  static getIssuesFoundMessage(bot, data) {
    if (bot.personality.style === 'taldarim') {
      return {
        title: `${bot.personality.emojis[0]} Elimination Verdict: Timesheet Weaknesses Found`,
        sections: [
          {
            text: `${bot.personality.greeting} ${data.userName}.\n\nMy blade thirsts... and finds your submission wanting. ${bot.personality.quotes[1]}`
          },
          {
            header: 'Weaknesses Identified',
            items: data.issues.map(issue => `${bot.personality.emojis[0]} ${issue}`)
          },
          {
            header: 'Strength Assessment',
            items: [
              `${bot.personality.emojis[3]} Hours tracked: ${data.totalHours} - ${data.totalHours < 70 ? 'WEAK' : 'Acceptable'}`,
              `${bot.personality.emojis[4]} Days with entries: ${data.daysWorked} - ${data.daysWorked < 10 ? 'PATHETIC' : 'Sufficient'}`,
              `${bot.personality.emojis[1]} Average hours/day: ${data.avgHours}`
            ]
          },
          {
            text: `${bot.personality.quotes[2]}\n\nCorrect these weaknesses immediately: ${data.kimaiUrl}\n\n${bot.personality.signoff}`
          }
        ]
      };
    } else {
      return {
        title: `${bot.personality.emojis[0]} Inevitability Assessment: Timesheet Failures`,
        sections: [
          {
            text: `${bot.personality.greeting} you believe your timesheet is adequate.\n\n${bot.personality.quotes[1]}`
          },
          {
            header: 'Systematic Failures',
            items: data.issues.map(issue => `${bot.personality.emojis[1]} ${issue}`)
          },
          {
            header: 'The Pattern',
            items: [
              `${bot.personality.emojis[0]} Hours logged: ${data.totalHours} (System minimum: 70)`,
              `${bot.personality.emojis[2]} Days tracked: ${data.daysWorked} (Required: 10+)`,
              `${bot.personality.emojis[3]} Daily average: ${data.avgHours} hours`
            ]
          },
          {
            text: `The purpose of timesheets is control. Submit to it.\n\n${data.kimaiUrl}\n\n${bot.personality.signoff}`
          }
        ]
      };
    }
  }

  static getReminderMessage(bot, data) {
    if (bot.personality.style === 'taldarim') {
      return {
        title: `${bot.personality.emojis[0]} Hunt Warning: Pay Period Terminating`,
        sections: [
          {
            text: `The culling approaches. ${data.daysRemaining} days remain before the Highlord's judgment.`
          },
          {
            header: 'Survival Requirements',
            items: [
              `${bot.personality.emojis[0]} Track all hours - weakness is not tolerated`,
              `${bot.personality.emojis[4]} Document your work - vague entries mark you as weak`,
              `${bot.personality.emojis[3]} Verify accuracy - errors invite elimination`,
              `${bot.personality.emojis[2]} Submit before deadline: ${data.kimaiUrl}`
            ]
          },
          {
            text: `${bot.personality.quotes[3]}\n\n${bot.personality.signoff}`
          }
        ]
      };
    } else {
      return {
        title: `${bot.personality.emojis[0]} System Alert: Pay Cycle Termination Imminent`,
        sections: [
          {
            text: `The current iteration ends in ${data.daysRemaining} days. ${bot.personality.quotes[4]}`
          },
          {
            header: 'The Inevitable Process',
            items: [
              `${bot.personality.emojis[0]} Phase 1: Submit all temporal data`,
              `${bot.personality.emojis[2]} Phase 2: Annotate with purpose codes`,
              `${bot.personality.emojis[3]} Phase 3: System validation`,
              `${bot.personality.emojis[4]} Access node: ${data.kimaiUrl}`
            ]
          },
          {
            text: `${bot.personality.quotes[2]}\n\n${bot.personality.signoff}`
          }
        ]
      };
    }
  }

  static getSummaryMessage(bot, data) {
    const emoji = bot.personality.emojis[0];
    
    if (bot.personality.style === 'taldarim') {
      return {
        title: `${emoji} Hunt Summary: Elimination Report`,
        sections: data.sections
      };
    } else {
      return {
        title: `${emoji} System Analysis: Inevitability Report`,
        sections: data.sections
      };
    }
  }

  static getGenericMessage(bot, data) {
    return {
      title: `${bot.personality.emojis[0]} ${data.title || 'Message from ' + bot.name}`,
      sections: data.sections || [{ text: data.text || 'No message content' }]
    };
  }
}

module.exports = BotConfig;