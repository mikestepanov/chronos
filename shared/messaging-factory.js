const PumbleClient = require('./pumble-client');
const NotificationWrapper = require('./notification-wrapper');

/**
 * Simplified MessagingFactory - Pumble only
 * Creates PumbleClient with optional notification wrapper
 */
class MessagingFactory {
  /**
   * Create a Pumble client with optional features
   * @param {string} platform - Ignored, always creates Pumble client
   * @param {Object} config - Configuration for PumbleClient
   * @param {Object} options - Additional options
   * @param {boolean} options.enableNotifications - Wrap client with notifications to Mikhail
   * @returns {PumbleClient} Configured Pumble client
   */
  static create(platform, config, options = {}) {
    // Always create PumbleClient regardless of platform parameter
    const client = new PumbleClient(config);

    // Wrap with notification system if enabled
    if (options.enableNotifications) {
      new NotificationWrapper(client);
    }

    return client;
  }
}

module.exports = MessagingFactory;