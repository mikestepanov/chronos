const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const Storage = require('./Storage');

/**
 * File-based storage implementation
 * Stores CSV files with versioning and metadata
 */
class FileStorage extends Storage {
  constructor(basePath = './kimai-data') {
    super();
    this.basePath = basePath;
  }

  async ensureDirectory(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  getPeriodPath(periodId) {
    return path.join(this.basePath, periodId);
  }

  getMetadataPath(periodId) {
    return path.join(this.getPeriodPath(periodId), 'metadata.json');
  }

  getCsvPath(periodId, version) {
    return path.join(this.getPeriodPath(periodId), `v${version}.csv`);
  }

  calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  async save(periodId, csvData, metadata = {}) {
    const periodPath = this.getPeriodPath(periodId);
    await this.ensureDirectory(periodPath);

    // Load existing metadata
    let periodMetadata = { versions: [] };
    try {
      const existing = await fs.readFile(this.getMetadataPath(periodId), 'utf8');
      periodMetadata = JSON.parse(existing);
    } catch (error) {
      // No existing metadata
    }

    // Calculate next version
    const version = periodMetadata.versions.length + 1;
    const checksum = this.calculateChecksum(csvData);
    
    // Check if data has changed
    const latest = periodMetadata.versions[periodMetadata.versions.length - 1];
    if (latest && latest.checksum === checksum) {
      // No changes, return existing entry
      return {
        periodId,
        version: latest.version,
        extractedAt: new Date(latest.extractedAt),
        csvPath: this.getCsvPath(periodId, latest.version),
        metadata: latest.metadata,
        checksum: latest.checksum
      };
    }

    // Save CSV file
    const csvPath = this.getCsvPath(periodId, version);
    await fs.writeFile(csvPath, csvData, 'utf8');

    // Count records (simple line count minus header)
    const recordCount = csvData.split('\n').filter(line => line.trim()).length - 1;

    // Generate changes file if this is not the first version
    if (version > 1) {
      const previousVersion = version - 1;
      const changes = await this.generateChangesFile(periodId, previousVersion, version, csvData);
      if (changes) {
        const changesPath = path.join(this.getPeriodPath(periodId), `v${previousVersion}-v${version}-changes.txt`);
        await fs.writeFile(changesPath, changes, 'utf8');
      }
    }

    // Create storage entry
    const entry = {
      periodId,
      version,
      extractedAt: new Date(),
      csvPath,
      metadata: {
        ...metadata,
        recordCount,
        bytes: Buffer.byteLength(csvData, 'utf8')
      },
      checksum
    };

    // Update metadata
    periodMetadata.versions.push({
      version,
      extractedAt: entry.extractedAt.toISOString(),
      checksum,
      metadata: entry.metadata
    });
    periodMetadata.latest = version;
    periodMetadata.updatedAt = new Date().toISOString();

    await fs.writeFile(
      this.getMetadataPath(periodId),
      JSON.stringify(periodMetadata, null, 2),
      'utf8'
    );

    return entry;
  }

  async getLatest(periodId) {
    try {
      const metadata = JSON.parse(
        await fs.readFile(this.getMetadataPath(periodId), 'utf8')
      );
      
      if (!metadata.latest) return null;
      
      return this.getVersion(periodId, metadata.latest);
    } catch (error) {
      return null;
    }
  }

  async getVersion(periodId, version) {
    try {
      const metadata = JSON.parse(
        await fs.readFile(this.getMetadataPath(periodId), 'utf8')
      );
      
      const versionData = metadata.versions.find(v => v.version === version);
      if (!versionData) return null;

      return {
        periodId,
        version: versionData.version,
        extractedAt: new Date(versionData.extractedAt),
        csvPath: this.getCsvPath(periodId, version),
        metadata: versionData.metadata,
        checksum: versionData.checksum
      };
    } catch (error) {
      return null;
    }
  }

  async getAllVersions(periodId) {
    try {
      const metadata = JSON.parse(
        await fs.readFile(this.getMetadataPath(periodId), 'utf8')
      );
      
      return metadata.versions.map(v => ({
        periodId,
        version: v.version,
        extractedAt: new Date(v.extractedAt),
        csvPath: this.getCsvPath(periodId, v.version),
        metadata: v.metadata,
        checksum: v.checksum
      }));
    } catch (error) {
      return [];
    }
  }

  async getCSV(periodId, version) {
    try {
      const csvPath = this.getCsvPath(periodId, version);
      return await fs.readFile(csvPath, 'utf8');
    } catch (error) {
      return null;
    }
  }

  async listPeriods() {
    try {
      const entries = await fs.readdir(this.basePath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();
    } catch (error) {
      return [];
    }
  }

  async hasPeriod(periodId) {
    try {
      await fs.access(this.getMetadataPath(periodId));
      return true;
    } catch (error) {
      return false;
    }
  }

  async compareVersions(periodId, version1, version2) {
    const csv1 = await this.getCSV(periodId, version1);
    const csv2 = await this.getCSV(periodId, version2);

    if (!csv1 || !csv2) {
      throw new Error(`Version not found for period ${periodId}`);
    }

    // Simple line-based comparison
    const lines1 = csv1.split('\n').filter(l => l.trim());
    const lines2 = csv2.split('\n').filter(l => l.trim());

    // Skip headers
    const records1 = new Set(lines1.slice(1));
    const records2 = new Set(lines2.slice(1));

    const added = [...records2].filter(r => !records1.has(r));
    const removed = [...records1].filter(r => !records2.has(r));

    return {
      periodId,
      version1,
      version2,
      hasChanges: added.length > 0 || removed.length > 0,
      addedRecords: added,
      removedRecords: removed,
      modifiedRecords: [] // Would need more sophisticated comparison
    };
  }

  async generateChangesFile(periodId, oldVersion, newVersion, newCsvData) {
    try {
      const oldCsv = await this.getCSV(periodId, oldVersion);
      if (!oldCsv) return null;

      const comparison = await this.compareVersions(periodId, oldVersion, newVersion);
      
      if (!comparison.hasChanges) {
        return null;
      }

      // Parse CSVs to get user summaries
      const oldLines = oldCsv.split('\n').filter(l => l.trim());
      const newLines = newCsvData.split('\n').filter(l => l.trim());
      
      // Parse headers
      const headers = oldLines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const userIndex = headers.indexOf('User');
      const durationIndex = headers.indexOf('Duration');
      
      // Aggregate hours by user for both versions
      const oldUserHours = this.aggregateUserHours(oldLines.slice(1), userIndex, durationIndex);
      const newUserHours = this.aggregateUserHours(newLines.slice(1), userIndex, durationIndex);
      
      // Generate change report
      let report = `Pay Period ${periodId} - Changes from v${oldVersion} to v${newVersion}\n`;
      report += `Generated: ${new Date().toISOString()}\n`;
      report += `${'='.repeat(60)}\n\n`;
      
      // Summary of changes
      report += `SUMMARY OF CHANGES\n`;
      report += `${''.repeat(18)}\n`;
      report += `Added entries: ${comparison.addedRecords.length}\n`;
      report += `Removed entries: ${comparison.removedRecords.length}\n\n`;
      
      // Hours changes by user
      report += `HOURS CHANGES BY USER\n`;
      report += `${''.repeat(21)}\n\n`;
      
      const allUsers = new Set([...Object.keys(oldUserHours), ...Object.keys(newUserHours)]);
      const userChanges = [];
      
      allUsers.forEach(user => {
        const oldHours = oldUserHours[user] || 0;
        const newHours = newUserHours[user] || 0;
        const change = newHours - oldHours;
        
        if (Math.abs(change) > 0.01) { // Only show if there's a meaningful change
          userChanges.push({
            user,
            oldHours,
            newHours,
            change
          });
        }
      });
      
      // Sort by absolute change descending
      userChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
      
      userChanges.forEach(({ user, oldHours, newHours, change }) => {
        const sign = change >= 0 ? '+' : '';
        report += `${user.padEnd(25)} ${oldHours.toFixed(2).padStart(8)} → ${newHours.toFixed(2).padStart(8)} (${sign}${change.toFixed(2)})\n`;
      });
      
      if (comparison.addedRecords.length > 0) {
        report += `\n\nNEW ENTRIES ADDED\n`;
        report += `${'-'.repeat(17)}\n`;
        comparison.addedRecords.slice(0, 10).forEach(record => {
          const fields = this.parseCSVLine(record);
          if (fields[userIndex] && fields[durationIndex]) {
            report += `+ ${fields[userIndex]} - ${fields[durationIndex]} - ${fields[headers.indexOf('Activity')] || 'N/A'}\n`;
          }
        });
        if (comparison.addedRecords.length > 10) {
          report += `... and ${comparison.addedRecords.length - 10} more entries\n`;
        }
      }
      
      if (comparison.removedRecords.length > 0) {
        report += `\n\nENTRIES REMOVED\n`;
        report += `${'-'.repeat(16)}\n`;
        comparison.removedRecords.slice(0, 10).forEach(record => {
          const fields = this.parseCSVLine(record);
          if (fields[userIndex] && fields[durationIndex]) {
            report += `- ${fields[userIndex]} - ${fields[durationIndex]} - ${fields[headers.indexOf('Activity')] || 'N/A'}\n`;
          }
        });
        if (comparison.removedRecords.length > 10) {
          report += `... and ${comparison.removedRecords.length - 10} more entries\n`;
        }
      }
      
      return report;
      
    } catch (error) {
      console.error('Error generating changes file:', error);
      return null;
    }
  }

  aggregateUserHours(lines, userIndex, durationIndex) {
    const userHours = {};
    
    lines.forEach(line => {
      const fields = this.parseCSVLine(line);
      const user = fields[userIndex];
      const duration = fields[durationIndex];
      
      if (user && duration) {
        // Parse duration (format: "5:00" or similar)
        const [hours, minutes] = duration.split(':').map(Number);
        const totalHours = hours + (minutes || 0) / 60;
        
        if (!userHours[user]) {
          userHours[user] = 0;
        }
        userHours[user] += totalHours;
      }
    });
    
    return userHours;
  }

  parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current.trim());
    return fields;
  }
}

module.exports = FileStorage;