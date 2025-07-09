const axios = require('axios');
const { format } = require('date-fns');
const UserMapping = require('./UserMapping');

/**
 * Kimai API Client
 * Responsible ONLY for API communication
 * No business logic, no data transformation
 */
class KimaiAPI {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    this.token = null;
    this.axios = axios.create({
      timeout: config.timeout || 30000,
      validateStatus: status => status < 500
    });
    this.userMapping = new UserMapping(config.userMappingFile);
    this.userMappingLoaded = false;
  }

  async authenticate() {
    if (this.apiKey) {
      return; // API key auth doesn't need token
    }

    try {
      const response = await this.axios.post(`${this.baseUrl}/api/login`, {
        username: this.username,
        password: this.password
      });

      if (response.status !== 200) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      this.token = response.data.token;
    } catch (error) {
      throw new Error(`Kimai authentication failed: ${error.message}`);
    }
  }

  async getHeaders() {
    const headers = {};
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else {
      if (!this.token) {
        await this.authenticate();
      }
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  /**
   * Ensure user mappings are loaded
   */
  async ensureUserMappings() {
    if (!this.userMappingLoaded) {
      try {
        await this.userMapping.load();
        this.userMappingLoaded = true;
      } catch (error) {
        console.warn('Could not load user mappings:', error.message);
      }
    }
  }

  /**
   * Export timesheet data as CSV
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise<string>} Raw CSV data
   */
  async exportCSV(startDate, endDate) {
    // Ensure user mappings are loaded
    await this.ensureUserMappings();
    
    // Since /api/export doesn't exist, create CSV from timesheets data
    const timesheets = await this.getTimesheets(startDate, endDate);
    
    if (!timesheets || timesheets.length === 0) {
      // Return empty CSV with headers
      return 'Date,User,Duration,Project,Activity,Description\n';
    }
    
    // Convert timesheets to CSV format
    const headers = ['Date', 'User', 'Duration', 'Project', 'Activity', 'Description'];
    const rows = [headers.join(',')];
    
    for (const entry of timesheets) {
      // Handle different user data formats
      let userName = 'Unknown';
      let kimaiUserId = null;
      
      if (entry.user) {
        if (typeof entry.user === 'object') {
          kimaiUserId = entry.user.id;
          userName = entry.user.alias || entry.user.username || entry.user.email || `User ${entry.user.id}`;
        } else if (typeof entry.user === 'number' || typeof entry.user === 'string') {
          kimaiUserId = parseInt(entry.user);
          userName = `User ${entry.user}`;
        }
        
        // Try to get real name from mapping
        if (kimaiUserId && this.userMapping) {
          const mappedName = this.userMapping.getName(kimaiUserId);
          if (mappedName && mappedName !== `User ${kimaiUserId}`) {
            userName = mappedName;
          }
        }
      }
      
      const row = [
        format(new Date(entry.begin), 'yyyy-MM-dd'),
        userName,
        (entry.duration / 3600).toFixed(2), // Convert seconds to hours
        entry.project?.name || '',
        entry.activity?.name || '',
        (entry.description || '').replace(/,/g, ';').replace(/\n/g, ' ')
      ];
      rows.push(row.map(field => `"${field}"`).join(','));
    }
    
    return rows.join('\n');
  }

  /**
   * Get raw timesheet data
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {Promise<Array>} Timesheet entries
   */
  async getTimesheets(startDate, endDate) {
    const headers = await this.getHeaders();
    
    // For admin users, need to explicitly request all users
    let response = await this.axios.get(`${this.baseUrl}/api/timesheets`, {
      headers,
      params: {
        user: 'all', // Required for admins to see all timesheets
        begin: format(startDate, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
        size: 10000 // Maximum allowed
      }
    });

    if (response.status !== 200) {
      throw new Error(`Timesheet fetch failed: ${response.status} - ${response.statusText}`);
    }

    return response.data;
  }

  /**
   * Get all users
   * @returns {Promise<Array>} User list
   */
  async getUsers() {
    const headers = await this.getHeaders();
    
    const response = await this.axios.get(`${this.baseUrl}/api/users`, {
      headers
    });

    if (response.status !== 200) {
      throw new Error(`Users fetch failed: ${response.status} - ${response.statusText}`);
    }

    return response.data;
  }

  /**
   * Get all projects
   * @returns {Promise<Array>} Project list
   */
  async getProjects() {
    const headers = await this.getHeaders();
    
    const response = await this.axios.get(`${this.baseUrl}/api/projects`, {
      headers
    });

    if (response.status !== 200) {
      throw new Error(`Projects fetch failed: ${response.status} - ${response.statusText}`);
    }

    return response.data;
  }

  /**
   * Test API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const headers = await this.getHeaders();
      const response = await this.axios.get(`${this.baseUrl}/api/ping`, { headers });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

module.exports = KimaiAPI;