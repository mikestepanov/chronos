const FileStorage = require('./FileStorage');
const GitStorage = require('./GitStorage');

/**
 * Storage Factory
 * Creates the appropriate storage implementation based on configuration
 */
class StorageFactory {
  static create(config) {
    const { type, basePath, git } = config.storage;
    
    switch (type) {
      case 'git':
        return new GitStorage(basePath, git);
      
      case 'file':
      default:
        return new FileStorage(basePath);
    }
  }
}

module.exports = StorageFactory;