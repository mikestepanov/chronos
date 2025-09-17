/**
 * Central channel configuration
 * Single source of truth for all channel IDs
 */

const fs = require('fs');
const path = require('path');

class Channels {
  constructor() {
    this._channels = null;
    this._configPath = path.join(__dirname, '..', 'config', 'channels.json');
  }

  /**
   * Load channels from config file
   * @returns {Object} Channel configuration
   */
  load() {
    if (!this._channels) {
      try {
        const data = fs.readFileSync(this._configPath, 'utf8');
        const config = JSON.parse(data);
        this._channels = config.pumble || {};
        this._dmChannels = config.dm_channels || {};
      } catch (error) {
        console.error('Failed to load channels config:', error);
        this._channels = {};
        this._dmChannels = {};
      }
    }
    return this._channels;
  }

  /**
   * Get all channel IDs
   * @returns {Object} Map of channel names to IDs
   */
  getAll() {
    this.load();
    const ids = {};
    for (const [key, channel] of Object.entries(this._channels)) {
      ids[key] = channel.id;
    }
    for (const [key, channel] of Object.entries(this._dmChannels)) {
      ids[key] = channel.id;
    }
    return ids;
  }

  /**
   * Get a specific channel ID
   * @param {string} name - Channel name (e.g., 'dev', 'design', 'bot_testing')
   * @returns {string|null} Channel ID or null if not found
   */
  get(name) {
    this.load();
    
    // Check regular channels
    if (this._channels[name]) {
      return this._channels[name].id;
    }
    
    // Check DM channels
    if (this._dmChannels[name]) {
      return this._dmChannels[name].id;
    }
    
    return null;
  }

  /**
   * Get channel info
   * @param {string} name - Channel name
   * @returns {Object|null} Channel info object
   */
  getInfo(name) {
    this.load();
    return this._channels[name] || this._dmChannels[name] || null;
  }

  /**
   * Common channel ID getters for convenience
   */
  get DEV() { return this.get('dev'); }
  get DESIGN() { return this.get('design'); }
  get BOT_TESTING() { return this.get('bot_testing'); }
  get RANDOM() { return this.get('random'); }
  get BOT_TO_MIKHAIL() { return this.get('bot_to_mikhail'); }
}

// Export singleton instance
module.exports = new Channels();