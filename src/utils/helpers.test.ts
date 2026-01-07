/**
 * helpers.test.ts
 * Tests for helper utility functions
 */

import {
  addOptionalArg,
  addOptionalBooleanArg,
  addOptionalNumberArg,
  nullToUndefined,
} from './helpers.js';

describe('helpers', () => {
  describe('addOptionalArg', () => {
    it('should add string argument when value is defined', () => {
      const args: string[] = [];
      addOptionalArg(args, '--title', 'Test');
      expect(args).toEqual(['--title', 'Test']);
    });

    it('should not add argument when value is undefined', () => {
      const args: string[] = [];
      addOptionalArg(args, '--title', undefined);
      expect(args).toEqual([]);
    });

    it('should not add argument when value is empty string', () => {
      const args: string[] = [];
      addOptionalArg(args, '--title', '');
      expect(args).toEqual([]);
    });
  });

  describe('addOptionalBooleanArg', () => {
    it('should add boolean true argument', () => {
      const args: string[] = [];
      addOptionalBooleanArg(args, '--completed', true);
      expect(args).toEqual(['--completed', 'true']);
    });

    it('should add boolean false argument', () => {
      const args: string[] = [];
      addOptionalBooleanArg(args, '--completed', false);
      expect(args).toEqual(['--completed', 'false']);
    });

    it('should not add argument when value is undefined', () => {
      const args: string[] = [];
      addOptionalBooleanArg(args, '--completed', undefined);
      expect(args).toEqual([]);
    });
  });

  describe('addOptionalNumberArg', () => {
    it('should add number argument when value is defined', () => {
      const args: string[] = [];
      addOptionalNumberArg(args, '--priority', 5);
      expect(args).toEqual(['--priority', '5']);
    });

    it('should add zero as argument', () => {
      const args: string[] = [];
      addOptionalNumberArg(args, '--priority', 0);
      expect(args).toEqual(['--priority', '0']);
    });

    it('should not add argument when value is undefined', () => {
      const args: string[] = [];
      addOptionalNumberArg(args, '--priority', undefined);
      expect(args).toEqual([]);
    });
  });

  describe('nullToUndefined', () => {
    it('should convert null values to undefined for specified fields', () => {
      const obj = {
        id: '123',
        title: 'Test',
        notes: null,
        url: null,
        dueDate: '2024-01-01',
      };

      const result = nullToUndefined(obj, ['notes', 'url']);

      expect(result.id).toBe('123');
      expect(result.title).toBe('Test');
      expect(result.notes).toBeUndefined();
      expect(result.url).toBeUndefined();
      expect(result.dueDate).toBe('2024-01-01');
    });

    it('should not modify non-null values', () => {
      const obj = {
        id: '123',
        notes: 'Some notes',
        url: 'https://example.com',
      };

      const result = nullToUndefined(obj, ['notes', 'url']);

      expect(result.notes).toBe('Some notes');
      expect(result.url).toBe('https://example.com');
    });

    it('should not modify fields not in the list', () => {
      const obj = {
        id: '123',
        notes: null,
        otherField: null,
      };

      const result = nullToUndefined(obj, ['notes']);

      expect(result.notes).toBeUndefined();
      expect(result.otherField).toBeNull();
    });

    it('should handle empty fields array', () => {
      const obj = {
        id: '123',
        notes: null,
      };

      const result = nullToUndefined(obj, []);

      expect(result.notes).toBeNull();
    });

    it('should create a new object and not mutate the original', () => {
      const obj = {
        id: '123',
        notes: null,
      };

      const result = nullToUndefined(obj, ['notes']);

      expect(result).not.toBe(obj);
      expect(obj.notes).toBeNull();
      expect(result.notes).toBeUndefined();
    });
  });
});
