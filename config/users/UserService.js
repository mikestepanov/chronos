const fs = require('fs');
const path = require('path');

/**
 * Universal user service for managing user mappings across services
 */
class UserService {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, 'users.json');
    this.users = null;
    this.teams = null;
    this.loadConfig();
  }

  /**
   * Load user configuration
   */
  loadConfig() {
    try {
      const data = fs.readFileSync(this.configPath, 'utf8');
      const config = JSON.parse(data);
      this.users = config.users;
      this.teams = config.teams;
    } catch (error) {
      console.error('Error loading user config:', error);
      this.users = [];
      this.teams = {};
    }
  }

  /**
   * Get all active users
   */
  getActiveUsers() {
    return this.users.filter(user => user.active);
  }

  /**
   * Get users by team
   */
  getUsersByTeam(teamId) {
    return this.users.filter(user => user.active && user.team === teamId);
  }

  /**
   * Find user by service ID
   */
  findByServiceId(service, id) {
    return this.users.find(user => {
      const serviceData = user.services?.[service];
      return serviceData && (
        serviceData.id === id || 
        serviceData.username === id ||
        serviceData.id?.toString() === id?.toString()
      );
    });
  }

  /**
   * Get user's ID for a specific service
   */
  getServiceId(userId, service) {
    const user = this.users.find(u => u.id === userId);
    return user?.services?.[service]?.id;
  }

  /**
   * Get mapping for specific service
   */
  getServiceMapping(fromService, toService) {
    const mapping = {};
    
    for (const user of this.users) {
      const fromId = user.services?.[fromService]?.id;
      const toData = user.services?.[toService];
      
      if (fromId && toData) {
        mapping[fromId] = toData;
      }
    }
    
    return mapping;
  }

  /**
   * Get Kimai to Pumble mapping (for backward compatibility)
   */
  getKimaiToPumbleMapping() {
    const mapping = {};
    
    for (const user of this.users) {
      const kimaiId = user.services?.kimai?.id;
      const pumbleData = user.services?.pumble;
      
      if (kimaiId && pumbleData) {
        mapping[kimaiId] = {
          name: user.name,
          pumbleUsername: pumbleData.username,
          pumbleMention: pumbleData.mention,
          team: user.team,
          active: user.active
        };
      }
    }
    
    return mapping;
  }

  /**
   * Get team information
   */
  getTeam(teamId) {
    return this.teams?.[teamId];
  }

  /**
   * Get all teams
   */
  getAllTeams() {
    return Object.keys(this.teams || {});
  }

  /**
   * Add or update user
   */
  addUser(userData) {
    const existingIndex = this.users.findIndex(u => u.id === userData.id);
    
    if (existingIndex >= 0) {
      this.users[existingIndex] = { ...this.users[existingIndex], ...userData };
    } else {
      this.users.push(userData);
    }
    
    this.saveConfig();
  }

  /**
   * Save configuration back to file
   */
  saveConfig() {
    const config = {
      users: this.users,
      teams: this.teams,
      metadata: {
        updated: new Date().toISOString().split('T')[0],
        version: '1.0.0'
      }
    };
    
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Convert from CSV format (migration helper)
   */
  static fromCSV(csvPath) {
    const csv = fs.readFileSync(csvPath, 'utf8');
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',');
    
    const users = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const user = {
        id: values[1].toLowerCase().replace(/\s+/g, '-'),
        name: values[1],
        email: values[2] !== 'UNKNOWN' ? values[2] : `${values[1].toLowerCase().replace(/\s+/g, '.')}@example.com`,
        active: values[4] === 'true',
        team: 'dev', // Default, update manually
        services: {
          kimai: {
            id: parseInt(values[0]),
            username: values[1].toLowerCase().split(' ')[0]
          },
          pumble: {
            id: values[3],
            username: values[1].toLowerCase().split(' ')[0],
            mention: `<@${values[3]}>`
          }
        }
      };
      
      if (!user.name.includes('Unknown') && !user.name.includes('Test')) {
        users.push(user);
      }
    }
    
    return users;
  }
}

module.exports = UserService;