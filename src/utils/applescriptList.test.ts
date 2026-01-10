/**
 * applescriptList.test.ts
 * Tests for AppleScript-based list operations (emblem/icon)
 */

// Mock holder for the promisified execFile
const mockExecFileAsyncHolder: { fn: jest.Mock } = {
  fn: jest.fn(),
};

jest.mock('node:child_process', () => ({
  execFile: jest.fn(),
}));

jest.mock('node:util', () => ({
  promisify: () => mockExecFileAsyncHolder.fn,
}));

// Import after mocking
import { getListEmblem, parseEmblem, setListEmblem } from './applescriptList.js';

describe('applescriptList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecFileAsyncHolder.fn.mockReset();
  });

  describe('parseEmblem', () => {
    it('should parse valid emblem JSON with emoji', () => {
      const result = parseEmblem('{"Emoji" : "🎯"}');
      expect(result).toBe('🎯');
    });

    it('should parse emblem with different spacing', () => {
      const result = parseEmblem('{"Emoji":"👑"}');
      expect(result).toBe('👑');
    });

    it('should parse emblem with extra whitespace', () => {
      const result = parseEmblem('{"Emoji"  :  "🧪"}');
      expect(result).toBe('🧪');
    });

    it('should return null for null input', () => {
      const result = parseEmblem(null);
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseEmblem('');
      expect(result).toBeNull();
    });

    it('should return null for invalid format', () => {
      const result = parseEmblem('not a valid emblem');
      expect(result).toBeNull();
    });

    it('should return null for missing emoji value', () => {
      const result = parseEmblem('{"Emoji" : ""}');
      expect(result).toBeNull();
    });

    it('should handle multi-character emojis', () => {
      const result = parseEmblem('{"Emoji" : "👨‍💻"}');
      expect(result).toBe('👨‍💻');
    });
  });

  describe('getListEmblem', () => {
    it('should return emblem string on success', async () => {
      mockExecFileAsyncHolder.fn.mockResolvedValue({
        stdout: '{"Emoji" : "🎯"}\n',
      });

      const result = await getListEmblem('Test List');

      expect(result).toBe('{"Emoji" : "🎯"}');
      expect(mockExecFileAsyncHolder.fn).toHaveBeenCalledWith('osascript', [
        '-e',
        'tell application "Reminders" to get emblem of list "Test List"',
      ]);
    });

    it('should escape double quotes in list name', async () => {
      mockExecFileAsyncHolder.fn.mockResolvedValue({ stdout: '' });

      await getListEmblem('List "with" quotes');

      expect(mockExecFileAsyncHolder.fn).toHaveBeenCalledWith('osascript', [
        '-e',
        'tell application "Reminders" to get emblem of list "List \\"with\\" quotes"',
      ]);
    });

    it('should return null on error', async () => {
      mockExecFileAsyncHolder.fn.mockRejectedValue(
        new Error('AppleScript error'),
      );

      const result = await getListEmblem('Non-existent List');

      expect(result).toBeNull();
    });

    it('should return null for empty result', async () => {
      mockExecFileAsyncHolder.fn.mockResolvedValue({ stdout: '' });

      const result = await getListEmblem('List Without Icon');

      expect(result).toBeNull();
    });

    it('should return null for whitespace-only result', async () => {
      mockExecFileAsyncHolder.fn.mockResolvedValue({ stdout: '   \n  ' });

      const result = await getListEmblem('List Without Icon');

      expect(result).toBeNull();
    });
  });

  describe('setListEmblem', () => {
    it('should call osascript with correct emblem format', async () => {
      mockExecFileAsyncHolder.fn.mockResolvedValue({ stdout: '' });

      await setListEmblem('Test List', '🎯');

      expect(mockExecFileAsyncHolder.fn).toHaveBeenCalledWith('osascript', [
        '-e',
        'tell application "Reminders" to set emblem of list "Test List" to "{\\"Emoji\\" : \\"🎯\\"}"',
      ]);
    });

    it('should escape special characters in list name and emoji', async () => {
      mockExecFileAsyncHolder.fn.mockResolvedValue({ stdout: '' });

      await setListEmblem('List "Test"', '👨‍💻');

      expect(mockExecFileAsyncHolder.fn).toHaveBeenCalledWith('osascript', [
        '-e',
        'tell application "Reminders" to set emblem of list "List \\"Test\\"" to "{\\"Emoji\\" : \\"👨‍💻\\"}"',
      ]);
    });

    it('should propagate errors', async () => {
      mockExecFileAsyncHolder.fn.mockRejectedValue(
        new Error('Permission denied'),
      );

      await expect(setListEmblem('Test', '🎯')).rejects.toThrow(
        'Permission denied',
      );
    });
  });
});
