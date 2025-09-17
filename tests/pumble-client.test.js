const axios = require('axios');
const PumbleClient = require('../shared/pumble-client');
const { AuthenticationError, ExternalServiceError } = require('../shared/error-handler');

// Mock axios
jest.mock('axios');

describe('PumbleClient', () => {
  let client;
  const mockConfig = {
    apiKey: 'test-api-key',
    botEmail: 'bot@example.com',
    botId: 'bot123'
  };

  beforeEach(() => {
    client = new PumbleClient(mockConfig);
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with correct config', () => {
      expect(client.apiKey).toBe('test-api-key');
      expect(client.botEmail).toBe('bot@example.com');
      expect(client.botId).toBe('bot123');
      expect(client.baseUrl).toBe('https://pumble-api-keys.addons.marketplace.cake.com');
    });
  });

  describe('sendMessage', () => {
    test('should send message successfully', async () => {
      const mockResponse = { data: { id: 'msg123', success: true } };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.sendMessage('channel123', 'Hello World');

      expect(axios.post).toHaveBeenCalledWith(
        'https://pumble-api-keys.addons.marketplace.cake.com/sendMessage',
        {
          channelId: 'channel123',
          text: 'Hello World',
          asBot: false
        },
        {
          headers: { 'Api-Key': 'test-api-key' }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    test('should always use asBot as false even when specified', async () => {
      const mockResponse = { data: { id: 'msg123', success: true } };
      axios.post.mockResolvedValueOnce(mockResponse);

      await client.sendMessage('channel123', 'Hello', true);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          asBot: true
        }),
        expect.any(Object)
      );
    });

    test('should throw AuthenticationError on 401', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      axios.post.mockRejectedValueOnce(error);

      await expect(client.sendMessage('channel123', 'Hello'))
        .rejects.toThrow(AuthenticationError);
    });

    test('should throw ExternalServiceError on other errors', async () => {
      const error = new Error('Network error');
      axios.post.mockRejectedValueOnce(error);

      await expect(client.sendMessage('channel123', 'Hello'))
        .rejects.toThrow(ExternalServiceError);
    });
  });

  describe('sendDirectMessage', () => {
    test('should send direct message successfully', async () => {
      const mockResponse = { data: { id: 'dm123', success: true } };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.sendDirectMessage('user123', 'Hello User');

      expect(axios.post).toHaveBeenCalledWith(
        'https://pumble-api-keys.addons.marketplace.cake.com/sendDirectMessage',
        {
          userId: 'user123',
          text: 'Hello User',
          asBot: false
        },
        {
          headers: { 'Api-Key': 'test-api-key' }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    test('should throw AuthenticationError on 401', async () => {
      const error = new Error('Unauthorized');
      error.response = { status: 401 };
      axios.post.mockRejectedValueOnce(error);

      await expect(client.sendDirectMessage('user123', 'Hello'))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('createGroupChat', () => {
    test('should create private group chat by default', async () => {
      const mockResponse = { data: { id: 'group123', name: 'Test Group' } };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.createGroupChat(['user1', 'user2'], 'Test Group');

      expect(axios.post).toHaveBeenCalledWith(
        'https://pumble-api-keys.addons.marketplace.cake.com/createChannel',
        {
          name: 'Test Group',
          type: 'private',
          members: ['user1', 'user2']
        },
        {
          headers: { 'Api-Key': 'test-api-key' }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    test('should create public group chat when specified', async () => {
      const mockResponse = { data: { id: 'group123', name: 'Public Group' } };
      axios.post.mockResolvedValueOnce(mockResponse);

      await client.createGroupChat(['user1', 'user2'], 'Public Group', false);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'public'
        }),
        expect.any(Object)
      );
    });

    test('should throw error on failure', async () => {
      axios.post.mockRejectedValueOnce(new Error('API Error'));

      await expect(client.createGroupChat(['user1'], 'Test'))
        .rejects.toThrow('Failed to create chat: API Error');
    });
  });

  describe('getUsers', () => {
    test('should fetch users successfully', async () => {
      const mockUsers = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' }
      ];
      axios.get.mockResolvedValueOnce({ data: mockUsers });

      const result = await client.getUsers();

      expect(axios.get).toHaveBeenCalledWith(
        'https://pumble-api-keys.addons.marketplace.cake.com/users',
        {
          headers: { 'Api-Key': 'test-api-key' }
        }
      );
      expect(result).toEqual(mockUsers);
    });

    test('should throw error on failure', async () => {
      axios.get.mockRejectedValueOnce(new Error('Network Error'));

      await expect(client.getUsers())
        .rejects.toThrow('Failed to fetch users: Network Error');
    });
  });

  describe('getUserByEmail', () => {
    test('should find user by email', async () => {
      const mockUsers = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' }
      ];
      axios.get.mockResolvedValueOnce({ data: mockUsers });

      const result = await client.getUserByEmail('user2@example.com');

      expect(result).toEqual({ id: 'user2', email: 'user2@example.com' });
    });

    test('should return null if user not found', async () => {
      axios.get.mockResolvedValueOnce({ data: [] });

      const result = await client.getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });

    test('should return null on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('API Error'));
      
      // Spy on console.error to suppress output during test
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await client.getUserByEmail('user@example.com');

      expect(result).toBeNull();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getChannels', () => {
    test('should fetch channels successfully', async () => {
      const mockChannels = [
        { id: 'channel1', name: 'General' },
        { id: 'channel2', name: 'Random' }
      ];
      axios.get.mockResolvedValueOnce({ data: mockChannels });

      const result = await client.getChannels();

      expect(axios.get).toHaveBeenCalledWith(
        'https://pumble-api-keys.addons.marketplace.cake.com/listChannels',
        {
          headers: { 'Api-Key': 'test-api-key' }
        }
      );
      expect(result).toEqual(mockChannels);
    });

    test('should throw error on failure', async () => {
      axios.get.mockRejectedValueOnce(new Error('API Error'));

      await expect(client.getChannels())
        .rejects.toThrow('Failed to fetch channels: API Error');
    });
  });

  describe('sendReply', () => {
    test('should send reply successfully', async () => {
      const mockResponse = { data: { id: 'reply123', success: true } };
      axios.post.mockResolvedValueOnce(mockResponse);

      const result = await client.sendReply('channel123', 'msg456', 'This is a reply');

      expect(axios.post).toHaveBeenCalledWith(
        'https://pumble-api-keys.addons.marketplace.cake.com/sendReply',
        {
          channelId: 'channel123',
          messageId: 'msg456',
          text: 'This is a reply',
          asBot: false
        },
        {
          headers: { 'Api-Key': 'test-api-key' }
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    test('should throw error on failure', async () => {
      axios.post.mockRejectedValueOnce(new Error('Reply failed'));

      await expect(client.sendReply('channel123', 'msg456', 'Reply'))
        .rejects.toThrow('Failed to send reply: Reply failed');
    });
  });

  describe('formatMessage', () => {
    test('should format message with title and sections', () => {
      const sections = [
        {
          header: 'Section 1',
          items: ['Item 1', 'Item 2']
        },
        {
          text: 'Some plain text'
        },
        {
          header: 'Section 2',
          items: ['Item A']
        }
      ];

      const result = client.formatMessage('Test Title', sections);

      expect(result).toContain('**Test Title**');
      expect(result).toContain('*Section 1*');
      expect(result).toContain('• Item 1');
      expect(result).toContain('• Item 2');
      expect(result).toContain('Some plain text');
      expect(result).toContain('*Section 2*');
      expect(result).toContain('• Item A');
    });

    test('should handle empty sections', () => {
      const result = client.formatMessage('Empty Test', []);
      expect(result).toBe('**Empty Test**');
    });

    test('should handle sections with only headers', () => {
      const sections = [{ header: 'Header Only' }];
      const result = client.formatMessage('Test', sections);
      
      expect(result).toContain('*Header Only*');
    });
  });
});