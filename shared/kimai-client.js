const axios = require('axios');
const { format } = require('date-fns');

class KimaiClient {
  constructor(config) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.username = config.username;
    this.password = config.password;
    this.token = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/login`, {
        username: this.username,
        password: this.password
      });
      this.token = response.data.token;
      return this.token;
    } catch (error) {
      console.error('Kimai authentication failed:', error.message);
      throw new Error(`Kimai auth failed: ${error.message}`);
    }
  }

  async getHeaders() {
    if (!this.token) {
      await this.authenticate();
    }
    return {
      'Authorization': `Bearer ${this.token}`,
      'X-AUTH-TOKEN': this.apiKey
    };
  }

  async getTimesheets(startDate, endDate) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/api/timesheets`, {
        headers,
        params: {
          begin: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
          size: 1000
        }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch timesheets:', error.message);
      throw new Error(`Failed to fetch timesheets: ${error.message}`);
    }
  }

  async getUsers() {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/api/users`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error.message);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  async exportCSV(startDate, endDate) {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/api/export`, {
        headers,
        params: {
          begin: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd'),
          type: 'csv'
        },
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      console.error('Failed to export CSV:', error.message);
      throw new Error(`Failed to export CSV: ${error.message}`);
    }
  }

  async getProjects() {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${this.baseUrl}/api/projects`, {
        headers
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch projects:', error.message);
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }
  }
}

module.exports = KimaiClient;