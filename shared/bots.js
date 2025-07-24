/**
 * Central bot configuration
 * Single source of truth for all bot IDs and info
 */

const fs = require('fs');
const path = require('path');

class Bots {
  constructor() {
    this._bots = null;
    this._configPath = path.join(__dirname, '..', 'config', 'bots.json');
  }

  /**
   * Load bots from config file
   * @returns {Object} Bot configuration
   */
  load() {
    if (!this._bots) {
      try {
        const data = fs.readFileSync(this._configPath, 'utf8');
        const config = JSON.parse(data);
        this._bots = config.bots || {};
      } catch (error) {
        console.error('Failed to load bots config:', error);
        this._bots = {};
      }
    }
    return this._bots;
  }

  /**
   * Get bot info
   * @param {string} name - Bot name (e.g., 'agentsmith', 'bloodhunter')
   * @returns {Object|null} Bot info object
   */
  get(name) {
    this.load();
    return this._bots[name] || null;
  }

  /**
   * Get bot ID for a specific service
   * @param {string} botName - Bot name
   * @param {string} service - Service name (default: 'pumble')
   * @returns {string|null} Bot ID or null if not found
   */
  getId(botName, service = 'pumble') {
    const bot = this.get(botName);
    return bot?.services?.[service]?.id || null;
  }

  /**
   * Common bot ID getters for convenience
   */
  get AGENTSMITH_ID() { return this.getId('agentsmith'); }
  get BLOODHUNTER_ID() { return this.getId('bloodhunter'); }
  
  /**
   * Get default bot ID (agentsmith)
   */
  get DEFAULT_BOT_ID() { return this.AGENTSMITH_ID; }
}

// Export singleton instance
module.exports = new Bots();