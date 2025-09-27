const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class KoyebDeployer {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.KOYEB_API_KEY;
    this.appName = config.appName || 'pay-period-bot';
    this.apiUrl = 'https://app.koyeb.com/v1';
  }

  /**
   * Deploy application to Koyeb using API
   */
  async deploy(options = {}) {
    try {
      console.log('🚀 Starting Koyeb deployment...');
      
      // Validate API key
      if (!this.apiKey) {
        throw new Error('KOYEB_API_KEY not found. Please set it in your environment.');
      }

      // Check if app exists
      const appExists = await this.checkAppExists();
      
      if (!appExists) {
        console.log('Creating new Koyeb app...');
        await this.createApp();
      }

      // Deploy service
      console.log('Deploying service...');
      const deployment = await this.deployService(options);
      
      console.log('✅ Deployment initiated successfully!');
      console.log(`🌐 Your app will be available at: https://${this.appName}.koyeb.app`);
      console.log(`📊 View deployment: https://app.koyeb.com/apps/${this.appName}`);
      
      return deployment;
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if app exists
   */
  async checkAppExists() {
    try {
      const response = await this.apiRequest(`/apps/${this.appName}`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Create new app
   */
  async createApp() {
    const response = await this.apiRequest('/apps', {
      method: 'POST',
      body: JSON.stringify({
        name: this.appName
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create app: ${error}`);
    }

    return response.json();
  }

  /**
   * Deploy service with environment variables
   */
  async deployService(options = {}) {
    const envVars = this.buildEnvVars();
    const gitInfo = this.getGitInfo();

    const serviceConfig = {
      definition: {
        name: this.appName,
        type: 'WEB',
        env: envVars,
        instance_types: [{
          type: 'free'
        }],
        ports: [{
          port: 3000,
          protocol: 'http'
        }],
        health_checks: [{
          protocol: 'http',
          port: 3000,
          path: '/health',
          interval: 60
        }],
        git: {
          repository: gitInfo.repository,
          branch: gitInfo.branch || 'main'
        },
        build: {
          build_command: 'npm install',
          run_command: 'npm start'
        },
        ...options
      }
    };

    const response = await this.apiRequest(`/services/${this.appName}`, {
      method: 'PUT',
      body: JSON.stringify(serviceConfig)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to deploy service: ${error}`);
    }

    return response.json();
  }

  /**
   * Build environment variables from .env file
   */
  buildEnvVars() {
    const envPath = path.join(process.cwd(), '.env');
    const envVars = [];

    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (key && value) {
            envVars.push({
              key: key.trim(),
              value: value.trim()
            });
          }
        }
      }
    }

    // Add NODE_ENV if not present
    if (!envVars.find(v => v.key === 'NODE_ENV')) {
      envVars.push({ key: 'NODE_ENV', value: 'production' });
    }

    return envVars;
  }

  /**
   * Get git repository info
   */
  getGitInfo() {
    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      
      // Convert SSH to HTTPS format
      let repository = remoteUrl;
      if (repository.startsWith('git@github.com:')) {
        repository = repository.replace('git@github.com:', 'https://github.com/');
      }
      if (repository.endsWith('.git')) {
        repository = repository.slice(0, -4);
      }

      return { repository, branch };
    } catch (error) {
      throw new Error('Not a git repository or no remote origin set');
    }
  }

  /**
   * Make API request to Koyeb
   */
  async apiRequest(endpoint, options = {}) {
    const url = `${this.apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    return response;
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus() {
    const response = await this.apiRequest(`/deployments?service_id=${this.appName}`);
    
    if (!response.ok) {
      throw new Error('Failed to get deployment status');
    }

    const data = await response.json();
    return data.deployments?.[0];
  }

  /**
   * Stream deployment logs
   */
  async streamLogs() {
    console.log('📋 Streaming logs...');
    
    // Note: Real-time log streaming would require WebSocket connection
    // This is a simplified version that polls logs
    const logs = await this.getLogs();
    console.log(logs);
  }

  /**
   * Get recent logs
   */
  async getLogs(limit = 100) {
    const response = await this.apiRequest(`/streams/logs?service_id=${this.appName}&limit=${limit}`);
    
    if (!response.ok) {
      throw new Error('Failed to get logs');
    }

    const data = await response.json();
    return data.logs?.map(log => log.message).join('\n') || 'No logs available';
  }

  /**
   * Delete app
   */
  async deleteApp() {
    const response = await this.apiRequest(`/apps/${this.appName}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete app');
    }

    console.log('✅ App deleted successfully');
  }
}

module.exports = KoyebDeployer;