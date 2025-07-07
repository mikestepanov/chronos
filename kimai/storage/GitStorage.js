const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const FileStorage = require('./FileStorage');

const execAsync = promisify(exec);

/**
 * Git-backed storage implementation
 * Extends FileStorage to add automatic Git commits
 */
class GitStorage extends FileStorage {
  constructor(basePath = './kimai-data', options = {}) {
    super(basePath);
    this.autoCommit = options.autoCommit !== false;
    this.autoPush = options.autoPush === true;
    this.remote = options.remote || 'origin';
    this.branch = options.branch || 'main';
  }

  async execGit(command, cwd = this.basePath) {
    try {
      const { stdout, stderr } = await execAsync(`git ${command}`, { cwd });
      return { success: true, stdout, stderr };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async initRepo() {
    // Check if already a git repo
    const status = await this.execGit('status');
    if (!status.success) {
      // Initialize new repo
      await this.execGit('init');
      await this.execGit('config user.name "Kimai Bot"');
      await this.execGit('config user.email "kimai-bot@starthub.academy"');
      
      // Create .gitignore
      const gitignore = `*.log\n.DS_Store\ntmp/\n`;
      await fs.writeFile(path.join(this.basePath, '.gitignore'), gitignore);
      
      await this.execGit('add .gitignore');
      await this.execGit('commit -m "Initial commit"');
    }
  }

  async pullLatest() {
    if (this.autoPush) {
      const result = await this.execGit(`pull ${this.remote} ${this.branch}`);
      if (!result.success && result.error.includes('no tracking information')) {
        // Set up tracking
        await this.execGit(`branch --set-upstream-to=${this.remote}/${this.branch}`);
      }
    }
  }

  async save(periodId, csvData, metadata = {}) {
    // Pull latest changes first
    await this.pullLatest();
    
    // Save using parent implementation
    const entry = await super.save(periodId, csvData, metadata);
    
    // Commit if enabled
    if (this.autoCommit && entry.version) {
      await this.commitChanges(entry);
    }
    
    return entry;
  }

  async commitChanges(entry) {
    const periodPath = this.getPeriodPath(entry.periodId);
    
    // Stage files
    await this.execGit(`add "${periodPath}"`, this.basePath);
    
    // Create commit message
    const isNewPeriod = entry.version === 1;
    const action = isNewPeriod ? 'Add' : 'Update';
    const message = `${action} timesheet data for period ${entry.periodId} (v${entry.version})

- Records: ${entry.metadata.recordCount}
- Extracted at: ${entry.extractedAt.toISOString()}
- Checksum: ${entry.checksum.substring(0, 8)}...

Automated commit by Kimai extraction bot`;
    
    // Commit
    const commitResult = await this.execGit(
      `commit -m "${message.replace(/"/g, '\\"')}"`,
      this.basePath
    );
    
    if (commitResult.success) {
      console.log(`Committed period ${entry.periodId} v${entry.version}`);
      
      // Push if enabled
      if (this.autoPush) {
        const pushResult = await this.execGit(`push ${this.remote} ${this.branch}`);
        if (pushResult.success) {
          console.log(`Pushed to ${this.remote}/${this.branch}`);
        } else {
          console.error(`Push failed: ${pushResult.error}`);
        }
      }
    }
  }

  async syncWithRemote() {
    // Pull latest
    await this.pullLatest();
    
    // Check for unpushed commits
    const status = await this.execGit(`status -sb`);
    if (status.stdout && status.stdout.includes('ahead')) {
      // Push pending commits
      await this.execGit(`push ${this.remote} ${this.branch}`);
    }
  }

  async getGitLog(periodId) {
    const periodPath = this.getPeriodPath(periodId);
    const result = await this.execGit(
      `log --oneline --follow -- "${periodPath}"`,
      this.basePath
    );
    
    return result.success ? result.stdout : '';
  }

  async getDiff(periodId, version1, version2) {
    const file1 = `v${version1}.csv`;
    const file2 = `v${version2}.csv`;
    const periodPath = this.getPeriodPath(periodId);
    
    const result = await this.execGit(
      `diff --no-index "${periodPath}/${file1}" "${periodPath}/${file2}"`,
      this.basePath
    );
    
    return result.stdout || result.stderr;
  }
}

module.exports = GitStorage;