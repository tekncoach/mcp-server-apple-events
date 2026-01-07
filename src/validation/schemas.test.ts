/**
 * schemas.test.ts
 * Tests for validation schemas
 */

import { z } from 'zod/v3';
import {
  CreateReminderListSchema,
  CreateReminderSchema,
  DeleteReminderSchema,
  ReadRemindersSchema,
  RequiredListNameSchema,
  SafeDateSchema,
  SafeGeofenceTitleSchema,
  SafeLatitudeSchema,
  SafeLongitudeSchema,
  SafeNoteSchema,
  SafeProximitySchema,
  SafeRadiusSchema,
  SafeTextSchema,
  SafeUrlSchema,
  UpdateReminderListSchema,
  UpdateReminderSchema,
  ValidationError,
  validateInput,
} from './schemas.js';

describe('ValidationSchemas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Base validation schemas', () => {
    describe('SafeTextSchema', () => {
      it('should validate safe text', () => {
        expect(() => SafeTextSchema.parse('Valid text')).not.toThrow();
        expect(() =>
          SafeTextSchema.parse('Text with numbers 123'),
        ).not.toThrow();
        expect(() =>
          SafeTextSchema.parse('Text with punctuation!'),
        ).not.toThrow();
      });

      it('should reject empty text', () => {
        expect(() => SafeTextSchema.parse('')).toThrow();
      });

      it('should reject text that is too long', () => {
        const longText = 'a'.repeat(201);
        expect(() => SafeTextSchema.parse(longText)).toThrow();
      });

      it('should reject text with invalid characters', () => {
        expect(() =>
          SafeTextSchema.parse('Text with control char \x00'),
        ).toThrow();
        // Note: \u200E (Right-to-left mark) is allowed by SAFE_TEXT_PATTERN as it's in the Unicode range
      });
    });

    describe('SafeNoteSchema', () => {
      it('should validate optional safe notes', () => {
        expect(() => SafeNoteSchema.parse(undefined)).not.toThrow();
        expect(() => SafeNoteSchema.parse('Valid note')).not.toThrow();
      });

      it('should reject notes that are too long', () => {
        const longNote = 'a'.repeat(2001);
        expect(() => SafeNoteSchema.parse(longNote)).toThrow();
      });

      it('should allow multiline notes', () => {
        const multilineNote = 'Line 1\nLine 2\r\nLine 3';
        expect(() => SafeNoteSchema.parse(multilineNote)).not.toThrow();
      });

      it('should use custom fieldName in error messages', () => {
        // SafeNoteSchema uses 'Note' as fieldName
        const longText = 'a'.repeat(2001);
        try {
          SafeNoteSchema.parse(longText);
          expect(true).toBe(false); // Should throw
        } catch (error) {
          // Error message should use custom 'Note' fieldName
          expect((error as Error).message).toContain('Note');
        }
      });
    });

    describe('RequiredListNameSchema', () => {
      it('should validate required list names', () => {
        expect(() => RequiredListNameSchema.parse('Work')).not.toThrow();
        expect(() => RequiredListNameSchema.parse('Personal')).not.toThrow();
      });

      it('should reject empty list names', () => {
        expect(() => RequiredListNameSchema.parse('')).toThrow();
      });

      it('should reject list names that are too long', () => {
        const longName = 'a'.repeat(101);
        expect(() => RequiredListNameSchema.parse(longName)).toThrow();
      });
    });

    describe('SafeDateSchema', () => {
      it('should validate ISO date formats', () => {
        expect(() => SafeDateSchema.parse('2024-01-15')).not.toThrow();
        expect(() => SafeDateSchema.parse('2024-01-15 10:30:00')).not.toThrow();
        expect(() =>
          SafeDateSchema.parse('2024-01-15T10:30:00Z'),
        ).not.toThrow();
      });

      it('should accept undefined dates', () => {
        expect(() => SafeDateSchema.parse(undefined)).not.toThrow();
      });

      it('should reject invalid date formats', () => {
        expect(() => SafeDateSchema.parse('01/15/2024')).toThrow();
        expect(() => SafeDateSchema.parse('not-a-date')).toThrow();
        // Note: DATE_PATTERN only checks basic format, doesn't validate date ranges
        expect(() => SafeDateSchema.parse('2024-13-45')).not.toThrow();
      });
    });

    describe('SafeUrlSchema', () => {
      it('should validate safe URLs', () => {
        expect(() => SafeUrlSchema.parse('https://example.com')).not.toThrow();
        expect(() =>
          SafeUrlSchema.parse('https://api.example.com/v1/users'),
        ).not.toThrow();
      });

      it('should accept undefined URLs', () => {
        expect(() => SafeUrlSchema.parse(undefined)).not.toThrow();
      });

      it('should reject URLs that are too long', () => {
        const longUrl = `https://example.com/${'a'.repeat(500)}`;
        expect(() => SafeUrlSchema.parse(longUrl)).toThrow();
      });

      it('should reject private/internal URLs', () => {
        expect(() => SafeUrlSchema.parse('http://127.0.0.1')).toThrow();
        expect(() => SafeUrlSchema.parse('http://192.168.1.1')).toThrow();
        expect(() => SafeUrlSchema.parse('http://10.0.0.1')).toThrow();
        expect(() => SafeUrlSchema.parse('http://localhost')).toThrow();
      });

      it('should reject invalid URL formats', () => {
        expect(() => SafeUrlSchema.parse('not-a-url')).toThrow();
        expect(() => SafeUrlSchema.parse('ftp://example.com')).toThrow();
      });
    });

    describe('Geofence schemas', () => {
      describe('SafeGeofenceTitleSchema', () => {
        it('should validate optional geofence titles', () => {
          expect(() => SafeGeofenceTitleSchema.parse(undefined)).not.toThrow();
          expect(() => SafeGeofenceTitleSchema.parse('Home')).not.toThrow();
          expect(() => SafeGeofenceTitleSchema.parse('Office')).not.toThrow();
          expect(() =>
            SafeGeofenceTitleSchema.parse('My Favorite Coffee Shop'),
          ).not.toThrow();
        });

        it('should reject titles that are too long', () => {
          const longTitle = 'a'.repeat(201);
          expect(() => SafeGeofenceTitleSchema.parse(longTitle)).toThrow();
        });
      });

      describe('SafeLatitudeSchema', () => {
        it('should validate valid latitudes', () => {
          expect(() => SafeLatitudeSchema.parse(undefined)).not.toThrow();
          expect(() => SafeLatitudeSchema.parse(0)).not.toThrow();
          expect(() => SafeLatitudeSchema.parse(37.7749)).not.toThrow();
          expect(() => SafeLatitudeSchema.parse(-33.8688)).not.toThrow();
          expect(() => SafeLatitudeSchema.parse(90)).not.toThrow();
          expect(() => SafeLatitudeSchema.parse(-90)).not.toThrow();
        });

        it('should reject latitudes out of range', () => {
          expect(() => SafeLatitudeSchema.parse(90.1)).toThrow();
          expect(() => SafeLatitudeSchema.parse(-90.1)).toThrow();
          expect(() => SafeLatitudeSchema.parse(180)).toThrow();
          expect(() => SafeLatitudeSchema.parse(-180)).toThrow();
        });
      });

      describe('SafeLongitudeSchema', () => {
        it('should validate valid longitudes', () => {
          expect(() => SafeLongitudeSchema.parse(undefined)).not.toThrow();
          expect(() => SafeLongitudeSchema.parse(0)).not.toThrow();
          expect(() => SafeLongitudeSchema.parse(-122.4194)).not.toThrow();
          expect(() => SafeLongitudeSchema.parse(151.2093)).not.toThrow();
          expect(() => SafeLongitudeSchema.parse(180)).not.toThrow();
          expect(() => SafeLongitudeSchema.parse(-180)).not.toThrow();
        });

        it('should reject longitudes out of range', () => {
          expect(() => SafeLongitudeSchema.parse(180.1)).toThrow();
          expect(() => SafeLongitudeSchema.parse(-180.1)).toThrow();
          expect(() => SafeLongitudeSchema.parse(360)).toThrow();
        });
      });

      describe('SafeRadiusSchema', () => {
        it('should validate valid radius values', () => {
          expect(() => SafeRadiusSchema.parse(undefined)).not.toThrow();
          expect(() => SafeRadiusSchema.parse(100)).not.toThrow();
          expect(() => SafeRadiusSchema.parse(1000)).not.toThrow();
          expect(() => SafeRadiusSchema.parse(100000)).not.toThrow();
        });

        it('should reject radius values out of range', () => {
          expect(() => SafeRadiusSchema.parse(0)).toThrow();
          expect(() => SafeRadiusSchema.parse(1)).toThrow();
          expect(() => SafeRadiusSchema.parse(99)).toThrow();
          expect(() => SafeRadiusSchema.parse(-1)).toThrow();
          expect(() => SafeRadiusSchema.parse(100001)).toThrow();
        });
      });

      describe('SafeProximitySchema', () => {
        it('should validate valid proximity values', () => {
          expect(() => SafeProximitySchema.parse(undefined)).not.toThrow();
          expect(() => SafeProximitySchema.parse('enter')).not.toThrow();
          expect(() => SafeProximitySchema.parse('leave')).not.toThrow();
        });

        it('should reject invalid proximity values', () => {
          expect(() => SafeProximitySchema.parse('arrive')).toThrow();
          expect(() => SafeProximitySchema.parse('depart')).toThrow();
          expect(() => SafeProximitySchema.parse('unknown')).toThrow();
        });
      });
    });
  });

  describe('Tool-specific schemas', () => {
    describe('Action schemas validation patterns', () => {
      it.each([
        {
          name: 'CreateReminderSchema',
          schema: CreateReminderSchema,
          validInput: {
            title: 'Test reminder',
            dueDate: '2024-01-15',
            note: 'Test note',
            url: 'https://example.com',
            targetList: 'Work',
            geofenceTitle: 'Home',
            geofenceLatitude: 37.7749,
            geofenceLongitude: -122.4194,
            geofenceRadius: 100,
            geofenceProximity: 'enter',
          },
          minimalInput: { title: 'Test reminder' },
          requiredFields: ['title'],
        },
        {
          name: 'UpdateReminderSchema',
          schema: UpdateReminderSchema,
          validInput: {
            id: '123',
            title: 'Updated title',
            dueDate: '2024-01-15',
            note: 'Updated note',
            url: 'https://example.com',
            completed: false,
            targetList: 'Work',
            geofenceTitle: 'Office',
            geofenceLatitude: 40.7128,
            geofenceLongitude: -74.006,
            geofenceRadius: 200,
            geofenceProximity: 'leave',
          },
          minimalInput: { id: '123' },
          requiredFields: ['id'],
        },
        {
          name: 'DeleteReminderSchema',
          schema: DeleteReminderSchema,
          validInput: { id: '123' },
          minimalInput: { id: '123' },
          requiredFields: ['id'],
        },
        {
          name: 'CreateReminderListSchema',
          schema: CreateReminderListSchema,
          validInput: { name: 'New List' },
          minimalInput: { name: 'New List' },
          requiredFields: ['name'],
        },
      ])(
        '$name validates correctly',
        ({ schema, validInput, minimalInput, requiredFields }) => {
          // Should validate full input
          expect(() => schema.parse(validInput)).not.toThrow();

          // Should validate minimal input with only required fields
          expect(() => schema.parse(minimalInput)).not.toThrow();

          // Should reject input missing required fields
          for (const field of requiredFields) {
            const invalidInput = { ...minimalInput } as Record<string, unknown>;
            delete invalidInput[field];
            expect(() => schema.parse(invalidInput)).toThrow();
          }
        },
      );
    });

    describe('ReadRemindersSchema', () => {
      it('should validate read reminders input with all optional fields', () => {
        const validInput = {
          id: '123',
          filterList: 'Work',
          showCompleted: true,
          search: 'meeting',
          dueWithin: 'today',
        };

        expect(() => ReadRemindersSchema.parse(validInput)).not.toThrow();
        expect(() => ReadRemindersSchema.parse({})).not.toThrow();
      });
    });

    describe('UpdateReminderListSchema', () => {
      it('should validate update list input with both required fields', () => {
        const validInput = {
          name: 'Old Name',
          newName: 'New Name',
        };

        expect(() => UpdateReminderListSchema.parse(validInput)).not.toThrow();
        expect(() => UpdateReminderListSchema.parse({ name: 'Old' })).toThrow();
        expect(() =>
          UpdateReminderListSchema.parse({ newName: 'New' }),
        ).toThrow();
      });
    });
  });

  describe('validateInput', () => {
    it('should return parsed data for valid input', () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const input = { name: 'John', age: 30 };

      const result = validateInput(schema, input);

      expect(result).toEqual(input);
    });

    it('should throw ValidationError for invalid input', () => {
      const schema = z.object({ name: z.string(), age: z.number() });
      const input = { name: 'John', age: 'thirty' };

      expect(() => validateInput(schema, input)).toThrow(ValidationError);
    });

    it('should include detailed error information', () => {
      const schema = z.object({
        name: z.string().min(2),
        age: z.number().min(0),
        email: z.string().email(),
      });
      const input = { name: 'J', age: -5, email: 'invalid-email' };

      try {
        validateInput(schema, input);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toBeDefined();
        expect(
          Object.keys(validationError.details as Record<string, string[]>),
        ).toHaveLength(3);
      }
    });

    it('should handle ValidationError instances specially', () => {
      const schema = SafeTextSchema;
      const input = ''; // Invalid: empty string

      try {
        validateInput(schema, input);
        fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as Error).message).toContain('cannot be empty');
      }
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Test validation error');

      expect(error.message).toBe('Test validation error');
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with message and details', () => {
      const details = { field1: ['Required'], field2: ['Invalid format'] };
      const error = new ValidationError('Validation failed', details);

      expect(error.message).toBe('Validation failed');
      expect(error.details).toBe(details);
    });

    it('should handle undefined details', () => {
      const error = new ValidationError('Test error');

      expect(error.details).toBeUndefined();
    });
  });

  describe('validateInput error handling', () => {
    it('should handle non-ZodError exceptions', () => {
      const schema = z.object({ name: z.string() });
      // Mock schema.parse to throw a non-ZodError
      const originalParse = schema.parse;
      schema.parse = jest.fn(() => {
        throw new Error('Unknown error');
      });

      expect(() => validateInput(schema, { name: 'test' })).toThrow(
        ValidationError,
      );

      const thrownError = (() => {
        try {
          validateInput(schema, { name: 'test' });
          return null;
        } catch (error) {
          return error;
        }
      })();

      expect(thrownError).toBeInstanceOf(ValidationError);
      expect((thrownError as ValidationError).message).toBe(
        'Input validation failed: Unknown error',
      );

      schema.parse = originalParse;
    });
  });
});
