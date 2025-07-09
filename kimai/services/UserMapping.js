const fs = require('fs').promises;
const path = require('path');
const UserService = require('../../config/users/UserService');

/**
 * User Mapping Service - Adapter for legacy code
 * Wraps the new UserService to maintain backward compatibility
 */
class UserMapping {
  constructor(mappingFile = null) {
    // Ignore mappingFile parameter, use new UserService
    this.userService = new UserService();
    this.users = new Map();
    this.kimaiToUser = new Map();
    this.emailToUser = new Map();
    this.pumbleToUser = new Map();
    this.nameToUser = new Map();
  }

  /**
   * Load user mappings from JSON
   */
  async load() {
    try {
      // Build maps from UserService data
      const activeUsers = this.userService.getActiveUsers();
      
      for (const user of activeUsers) {
        // Skip users without Kimai service
        if (!user.services.kimai) continue;
        
        const kimaiId = user.services.kimai.id.toString();
        const pumbleId = user.services.pumble.id;
        
        const userData = {
          kimaiId: parseInt(kimaiId),
          name: user.name,
          email: user.email,
          pumbleId: pumbleId,
          active: user.active
        };
        
        // Store in multiple indexes for fast lookup
        this.users.set(kimaiId, userData);
        this.kimaiToUser.set(parseInt(kimaiId), userData);
        this.emailToUser.set(user.email.toLowerCase(), userData);
        if (pumbleId) {
          this.pumbleToUser.set(pumbleId, userData);
        }
        this.nameToUser.set(user.name.toLowerCase(), userData);
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