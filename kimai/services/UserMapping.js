const fs = require('fs').promises;
const path = require('path');

/**
 * User Mapping Service
 * Maps between Kimai user IDs, names, emails, and Pumble IDs
 */
class UserMapping {
  constructor(mappingFile = null) {
    this.mappingFile = mappingFile || path.join(__dirname, '../config/user-mapping.csv');
    this.users = new Map();
    this.kimaiToUser = new Map();
    this.emailToUser = new Map();
    this.pumbleToUser = new Map();
    this.nameToUser = new Map();
  }

  /**
   * Load user mappings from CSV
   */
  async load() {
    try {
      const content = await fs.readFile(this.mappingFile, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const [kimaiId, name, email, pumbleId, active] = lines[i].split(',').map(s => s.trim());
        
        if (!kimaiId || active !== 'true') continue;
        
        const user = {
          kimaiId: parseInt(kimaiId),
          name,
          email,
          pumbleId,
          active: active === 'true'
        };
        
        // Store in multiple indexes for fast lookup
        this.users.set(kimaiId, user);
        this.kimaiToUser.set(parseInt(kimaiId), user);
        this.emailToUser.set(email.toLowerCase(), user);
        this.pumbleToUser.set(pumbleId, user);
        this.nameToUser.set(name.toLowerCase(), user);
      }
      
      console.log(`Loaded ${this.users.size} user mappings`);
    } catch (error) {
      console.error('Failed to load user mappings:', error.message);
      throw error;
    }
  }

  /**
   * Get user by Kimai ID
   */
  getByKimaiId(kimaiId) {
    return this.kimaiToUser.get(parseInt(kimaiId));
  }

  /**
   * Get user by email
   */
  getByEmail(email) {
    return this.emailToUser.get(email.toLowerCase());
  }

  /**
   * Get user by Pumble ID
   */
  getByPumbleId(pumbleId) {
    return this.pumbleToUser.get(pumbleId);
  }

  /**
   * Get user by name (case-insensitive)
   */
  getByName(name) {
    return this.nameToUser.get(name.toLowerCase());
  }

  /**
   * Get all active users
   */
  getActiveUsers() {
    return Array.from(this.users.values()).filter(user => user.active);
  }

  /**
   * Get Pumble ID for a Kimai user ID
   */
  getPumbleId(kimaiId) {
    const user = this.getByKimaiId(kimaiId);
    return user ? user.pumbleId : null;
  }

  /**
   * Get user name for a Kimai user ID
   */
  getName(kimaiId) {
    const user = this.getByKimaiId(kimaiId);
    return user ? user.name : `User ${kimaiId}`;
  }

  /**
   * Check if we have a valid Pumble ID for a Kimai user
   */
  hasPumbleId(kimaiId) {
    const user = this.getByKimaiId(kimaiId);
    return user && user.pumbleId && user.pumbleId !== 'PUMBLE_ID_HERE';
  }

  /**
   * Save updated mappings back to CSV
   */
  async save() {
    const header = 'kimai_id,name,email,pumble_id,active';
    const rows = [header];
    
    for (const user of this.users.values()) {
      rows.push([
        user.kimaiId,
        user.name,
        user.email,
        user.pumbleId,
        user.active
      ].join(','));
    }
    
    await fs.writeFile(this.mappingFile, rows.join('\n'));
  }

  /**
   * Add or update a user mapping
   */
  async addUser(kimaiId, name, email, pumbleId, active = true) {
    const user = {
      kimaiId: parseInt(kimaiId),
      name,
      email,
      pumbleId,
      active
    };
    
    // Update all indexes
    this.users.set(kimaiId.toString(), user);
    this.kimaiToUser.set(parseInt(kimaiId), user);
    this.emailToUser.set(email.toLowerCase(), user);
    this.pumbleToUser.set(pumbleId, user);
    this.nameToUser.set(name.toLowerCase(), user);
    
    await this.save();
  }
}

module.exports = UserMapping;