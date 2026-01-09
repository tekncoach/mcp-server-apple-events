/**
 * reminderRepository.test.ts
 * Tests for reminder repository
 */

import type { Reminder, ReminderList } from '../types/index.js';
import { executeCli } from './cliExecutor.js';
import type { ReminderFilters } from './dateFiltering.js';
import { applyReminderFilters } from './dateFiltering.js';
import { reminderRepository } from './reminderRepository.js';

// Mock dependencies
jest.mock('./cliExecutor.js');
jest.mock('./dateFiltering.js');

const mockExecuteCli = executeCli as jest.MockedFunction<typeof executeCli>;
const mockApplyReminderFilters = applyReminderFilters as jest.MockedFunction<
  typeof applyReminderFilters
>;

describe('ReminderRepository', () => {
  const repository = reminderRepository;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findReminderById', () => {
    it('should return reminder when found', async () => {
      const mockReminders: Partial<Reminder>[] = [
        { id: '1', title: 'Test 1', isCompleted: false, list: 'Default' },
        { id: '2', title: 'Test 2', isCompleted: true, list: 'Work' },
      ];
      const mockLists: ReminderList[] = [];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: mockLists,
      });

      const result = await repository.findReminderById('2');

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'read',
        '--showCompleted',
        'true',
      ]);

      expect(result).toEqual({
        id: '2',
        title: 'Test 2',
        isCompleted: true,
        list: 'Work',
        notes: undefined,
        url: undefined,
        dueDate: undefined,
      });
    });

    it('should throw error when reminder not found', async () => {
      const mockReminders: Partial<Reminder>[] = [
        { id: '1', title: 'Test 1', isCompleted: false, list: 'Default' },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });

      await expect(repository.findReminderById('999')).rejects.toThrow(
        "Reminder with ID '999' not found.",
      );
    });

    it('should handle reminders with notes and url', async () => {
      const mockReminders: Partial<Reminder>[] = [
        {
          id: '1',
          title: 'Test',
          isCompleted: false,
          list: 'Default',
          notes: 'Some notes',
          url: 'https://example.com',
          dueDate: '2024-01-15',
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });

      const result = await repository.findReminderById('1');

      expect(result.notes).toBe('Some notes');
      expect(result.url).toBe('https://example.com');
      expect(result.dueDate).toBe('2024-01-15');
    });

    it('should handle null notes and url as undefined', async () => {
      const mockReminders: Partial<Reminder>[] = [
        {
          id: '1',
          title: 'Test',
          isCompleted: false,
          list: 'Default',
          notes: undefined,
          url: undefined,
          dueDate: undefined,
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });

      const result = await repository.findReminderById('1');

      expect(result.notes).toBeUndefined();
      expect(result.url).toBeUndefined();
      expect(result.dueDate).toBeUndefined();
    });

    it('should pass through due dates from Swift CLI without normalization', async () => {
      const mockReminders: Partial<Reminder>[] = [
        {
          id: 'ad-1',
          title: 'AdSense Fix',
          isCompleted: false,
          list: 'Work',
          dueDate: '2025-11-15T08:30:00Z',
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });

      const result = await repository.findReminderById('ad-1');

      expect(result.dueDate).toBe('2025-11-15T08:30:00Z');
    });
  });

  describe('findReminders', () => {
    it('should return filtered reminders', async () => {
      const mockReminders: Partial<Reminder>[] = [
        { id: '1', title: 'Test 1', isCompleted: false, list: 'Default' },
        { id: '2', title: 'Test 2', isCompleted: true, list: 'Work' },
      ];
      const mockLists: ReminderList[] = [];
      const filters: ReminderFilters = { showCompleted: false };
      const filteredReminders: Reminder[] = [
        { id: '1', title: 'Test 1', isCompleted: false, list: 'Default' },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: mockLists,
      });
      mockApplyReminderFilters.mockReturnValue(filteredReminders);

      const result = await repository.findReminders(filters);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'read',
        '--showCompleted',
        'true',
      ]);
      expect(mockApplyReminderFilters).toHaveBeenCalledWith(
        expect.any(Array),
        filters,
      );
      expect(result).toBe(filteredReminders);
    });

    it('should convert JSON reminders to proper Reminder objects', async () => {
      const mockReminders: Partial<Reminder>[] = [
        {
          id: '1',
          title: 'Test',
          isCompleted: false,
          list: 'Default',
          notes: 'Notes',
          url: 'https://example.com',
          dueDate: '2024-01-15',
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0]).toEqual({
        id: '1',
        title: 'Test',
        isCompleted: false,
        list: 'Default',
        notes: 'Notes',
        url: 'https://example.com',
        dueDate: '2024-01-15',
      });
    });

    it('should handle empty filters', async () => {
      const mockReminders: Partial<Reminder>[] = [
        { id: '1', title: 'Test', isCompleted: false, list: 'Default' },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result).toHaveLength(1);
    });

    it('should pass through due dates from Swift CLI when listing reminders', async () => {
      const mockReminders: Partial<Reminder>[] = [
        {
          id: '99',
          title: 'Pass Through Date',
          isCompleted: false,
          list: 'Default',
          dueDate: '2025-11-20T02:00:00Z',
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].dueDate).toBe('2025-11-20T02:00:00Z');
    });

    it('should map geofence data with enter proximity', async () => {
      const mockReminders = [
        {
          id: 'geo-1',
          title: 'Location Reminder',
          isCompleted: false,
          list: 'Personal',
          geofence: {
            title: 'Office',
            latitude: 48.8566,
            longitude: 2.3522,
            radius: 200,
            proximity: 'enter',
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].geofence).toEqual({
        title: 'Office',
        latitude: 48.8566,
        longitude: 2.3522,
        radius: 200,
        proximity: 'enter',
      });
    });

    it('should map geofence data with leave proximity', async () => {
      const mockReminders = [
        {
          id: 'geo-2',
          title: 'Leave Reminder',
          isCompleted: false,
          list: 'Work',
          geofence: {
            title: 'Home',
            latitude: 37.7749,
            longitude: -122.4194,
            radius: 100,
            proximity: 'leave',
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].geofence).toEqual({
        title: 'Home',
        latitude: 37.7749,
        longitude: -122.4194,
        radius: 100,
        proximity: 'leave',
      });
    });

    it('should handle reminder without geofence', async () => {
      const mockReminders = [
        {
          id: 'no-geo',
          title: 'Normal Reminder',
          isCompleted: false,
          list: 'Default',
          geofence: null,
          recurrence: null,
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].geofence).toBeUndefined();
    });

    it('should map recurrence data with daily frequency', async () => {
      const mockReminders = [
        {
          id: 'rec-1',
          title: 'Daily Reminder',
          isCompleted: false,
          list: 'Personal',
          geofence: null,
          recurrence: {
            frequency: 'daily',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].recurrence).toEqual({
        frequency: 'daily',
        interval: 1,
      });
    });

    it('should map recurrence data with weekly frequency and occurrence count', async () => {
      const mockReminders = [
        {
          id: 'rec-2',
          title: 'Weekly Reminder',
          isCompleted: false,
          list: 'Work',
          geofence: null,
          recurrence: {
            frequency: 'weekly',
            interval: 2,
            endDate: null,
            occurrenceCount: 10,
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].recurrence).toEqual({
        frequency: 'weekly',
        interval: 2,
        occurrenceCount: 10,
      });
    });

    it('should map recurrence data with monthly frequency and end date', async () => {
      const mockReminders = [
        {
          id: 'rec-3',
          title: 'Monthly Reminder',
          isCompleted: false,
          list: 'Personal',
          geofence: null,
          recurrence: {
            frequency: 'monthly',
            interval: 1,
            endDate: '2025-12-31',
            occurrenceCount: null,
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].recurrence).toEqual({
        frequency: 'monthly',
        interval: 1,
        endDate: '2025-12-31',
      });
    });

    it('should handle reminder without recurrence', async () => {
      const mockReminders = [
        {
          id: 'no-rec',
          title: 'Normal Reminder',
          isCompleted: false,
          list: 'Default',
          geofence: null,
          recurrence: null,
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].recurrence).toBeUndefined();
    });

    it('should map unknown frequency to daily', async () => {
      const mockReminders = [
        {
          id: 'rec-unknown',
          title: 'Unknown Frequency Reminder',
          isCompleted: false,
          list: 'Default',
          geofence: null,
          recurrence: {
            frequency: 'unknown',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].recurrence).toEqual({
        frequency: 'daily',
        interval: 1,
      });
    });
  });

  describe('findAllLists', () => {
    it('should return all reminder lists', async () => {
      const mockLists: ReminderList[] = [
        { id: '1', title: 'Default' },
        { id: '2', title: 'Work' },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: [],
        lists: mockLists,
      });

      const result = await repository.findAllLists();

      expect(result).toEqual(mockLists);
    });

    it('should return empty array when no lists', async () => {
      mockExecuteCli.mockResolvedValue({
        reminders: [],
        lists: [],
      });

      const result = await repository.findAllLists();

      expect(result).toEqual([]);
    });
  });

  describe('createReminder', () => {
    it('should create reminder with all fields', async () => {
      const data = {
        title: 'New Reminder',
        list: 'Work',
        notes: 'Some notes',
        url: 'https://example.com',
        dueDate: '2024-01-15',
      };
      const mockResult: Reminder = {
        id: '123',
        title: 'New Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      const result = await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'New Reminder',
        '--targetList',
        'Work',
        '--note',
        'Some notes',
        '--url',
        'https://example.com',
        '--dueDate',
        '2024-01-15',
      ]);
      expect(result).toBe(mockResult);
    });

    it('should create reminder with minimal fields', async () => {
      const data = {
        title: 'Simple Reminder',
      };
      const mockResult: Reminder = {
        id: '123',
        title: 'Simple Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      const result = await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Simple Reminder',
      ]);
      expect(result).toBe(mockResult);
    });

    it('should handle optional fields correctly', async () => {
      const data = {
        title: 'Test',
        list: 'Work',
        // notes, url, dueDate omitted
      };
      const mockResult: Reminder = {
        id: '123',
        title: 'Test',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).not.toContain('--note');
      expect(args).not.toContain('--url');
      expect(args).not.toContain('--dueDate');
    });

    it('should create reminder with all geofence fields', async () => {
      const data = {
        title: 'Location Reminder',
        geofenceTitle: 'Office',
        geofenceLatitude: 48.8566,
        geofenceLongitude: 2.3522,
        geofenceRadius: 200,
        geofenceProximity: 'enter' as const,
      };
      const mockResult: Reminder = {
        id: '456',
        title: 'Location Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Location Reminder',
        '--geofenceTitle',
        'Office',
        '--geofenceLatitude',
        '48.8566',
        '--geofenceLongitude',
        '2.3522',
        '--geofenceRadius',
        '200',
        '--geofenceProximity',
        'enter',
      ]);
    });

    it('should create reminder with geofence without radius (default)', async () => {
      const data = {
        title: 'Default Radius Reminder',
        geofenceTitle: 'Home',
        geofenceLatitude: 37.7749,
        geofenceLongitude: -122.4194,
        geofenceProximity: 'leave' as const,
      };
      const mockResult: Reminder = {
        id: '789',
        title: 'Default Radius Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--geofenceTitle');
      expect(args).toContain('Home');
      expect(args).toContain('--geofenceProximity');
      expect(args).toContain('leave');
      expect(args).not.toContain('--geofenceRadius');
    });

    it('should create reminder with all recurrence fields', async () => {
      const data = {
        title: 'Weekly Reminder',
        recurrenceFrequency: 'weekly' as const,
        recurrenceInterval: 2,
        recurrenceEndDate: '2025-12-31',
        recurrenceOccurrenceCount: 10,
      };
      const mockResult: Reminder = {
        id: '999',
        title: 'Weekly Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Weekly Reminder',
        '--recurrenceFrequency',
        'weekly',
        '--recurrenceInterval',
        '2',
        '--recurrenceEndDate',
        '2025-12-31',
        '--recurrenceOccurrenceCount',
        '10',
      ]);
    });

    it('should create reminder with recurrence without end date', async () => {
      const data = {
        title: 'Daily Reminder',
        recurrenceFrequency: 'daily' as const,
        recurrenceInterval: 1,
      };
      const mockResult: Reminder = {
        id: '1000',
        title: 'Daily Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--recurrenceFrequency');
      expect(args).toContain('daily');
      expect(args).toContain('--recurrenceInterval');
      expect(args).toContain('1');
      expect(args).not.toContain('--recurrenceEndDate');
      expect(args).not.toContain('--recurrenceOccurrenceCount');
    });
  });

  describe('updateReminder', () => {
    it('should update reminder with all fields', async () => {
      const data = {
        id: '123',
        newTitle: 'Updated Title',
        list: 'Work',
        notes: 'Updated notes',
        url: 'https://updated.com',
        isCompleted: true,
        dueDate: '2024-01-20',
      };
      const mockResult: Reminder = {
        id: '123',
        title: 'Updated Title',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      const result = await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        '123',
        '--title',
        'Updated Title',
        '--targetList',
        'Work',
        '--note',
        'Updated notes',
        '--url',
        'https://updated.com',
        '--dueDate',
        '2024-01-20',
        '--isCompleted',
        'true',
      ]);
      expect(result).toBe(mockResult);
    });

    it('should update reminder with minimal fields', async () => {
      const data = {
        id: '123',
      };
      const mockResult: { id: string } = { id: '123' };

      mockExecuteCli.mockResolvedValue(mockResult);

      const result = await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        '123',
      ]);
      expect(result).toBe(mockResult);
    });

    it('should handle optional isCompleted field', async () => {
      const data = {
        id: '123',
        isCompleted: false,
      };

      mockExecuteCli.mockResolvedValue({ id: '123' });

      await repository.updateReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--isCompleted');
      expect(args).toContain('false');
    });

    it('should skip isCompleted when undefined', async () => {
      const data = {
        id: '123',
        newTitle: 'Updated',
        // isCompleted not provided
      };

      mockExecuteCli.mockResolvedValue({ id: '123' });

      await repository.updateReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).not.toContain('--isCompleted');
    });

    it('should update reminder with all geofence fields', async () => {
      const data = {
        id: 'geo-123',
        geofenceTitle: 'New Office',
        geofenceLatitude: 40.7128,
        geofenceLongitude: -74.006,
        geofenceRadius: 300,
        geofenceProximity: 'leave' as const,
      };

      mockExecuteCli.mockResolvedValue({ id: 'geo-123' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'geo-123',
        '--geofenceTitle',
        'New Office',
        '--geofenceLatitude',
        '40.7128',
        '--geofenceLongitude',
        '-74.006',
        '--geofenceRadius',
        '300',
        '--geofenceProximity',
        'leave',
      ]);
    });

    it('should update reminder with partial geofence (radius only)', async () => {
      const data = {
        id: 'geo-456',
        geofenceRadius: 500,
      };

      mockExecuteCli.mockResolvedValue({ id: 'geo-456' });

      await repository.updateReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--geofenceRadius');
      expect(args).toContain('500');
      expect(args).not.toContain('--geofenceTitle');
      expect(args).not.toContain('--geofenceLatitude');
      expect(args).not.toContain('--geofenceLongitude');
      expect(args).not.toContain('--geofenceProximity');
    });

    it('should update reminder with partial geofence (proximity only)', async () => {
      const data = {
        id: 'geo-789',
        geofenceProximity: 'enter' as const,
      };

      mockExecuteCli.mockResolvedValue({ id: 'geo-789' });

      await repository.updateReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--geofenceProximity');
      expect(args).toContain('enter');
      expect(args).not.toContain('--geofenceRadius');
    });

    it('should pass empty geofenceTitle for geofence removal', async () => {
      const data = {
        id: 'geo-remove',
        geofenceTitle: '',
      };

      mockExecuteCli.mockResolvedValue({ id: 'geo-remove' });

      await repository.updateReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--geofenceTitle');
      expect(args).toContain('');
      expect(args).not.toContain('--geofenceLatitude');
      expect(args).not.toContain('--geofenceLongitude');
      expect(args).not.toContain('--geofenceRadius');
      expect(args).not.toContain('--geofenceProximity');
    });

    it('should update reminder with all recurrence fields', async () => {
      const data = {
        id: 'rec-123',
        recurrenceFrequency: 'monthly' as const,
        recurrenceInterval: 3,
        recurrenceEndDate: '2026-06-30',
        recurrenceOccurrenceCount: 12,
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-123' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-123',
        '--recurrenceFrequency',
        'monthly',
        '--recurrenceInterval',
        '3',
        '--recurrenceEndDate',
        '2026-06-30',
        '--recurrenceOccurrenceCount',
        '12',
      ]);
    });

    it('should update reminder with partial recurrence (frequency only)', async () => {
      const data = {
        id: 'rec-456',
        recurrenceFrequency: 'yearly' as const,
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-456' });

      await repository.updateReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--recurrenceFrequency');
      expect(args).toContain('yearly');
      expect(args).not.toContain('--recurrenceInterval');
      expect(args).not.toContain('--recurrenceEndDate');
      expect(args).not.toContain('--recurrenceOccurrenceCount');
    });

    it('should pass clearRecurrence flag to clear recurrence', async () => {
      const data = {
        id: 'rec-remove',
        clearRecurrence: true,
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-remove' });

      await repository.updateReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).toContain('--clearRecurrence');
      expect(args).toContain('true');
    });
  });

  describe('deleteReminder', () => {
    it('should delete reminder by id', async () => {
      mockExecuteCli.mockResolvedValue(undefined);

      await repository.deleteReminder('123');

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'delete',
        '--id',
        '123',
      ]);
    });
  });

  describe('createReminderList', () => {
    it('should create reminder list', async () => {
      const mockResult: ReminderList = { id: '456', title: 'New List' };

      mockExecuteCli.mockResolvedValue(mockResult);

      const result = await repository.createReminderList('New List');

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create-list',
        '--name',
        'New List',
      ]);
      expect(result).toBe(mockResult);
    });

    it('should handle list names with special characters', async () => {
      const mockResult: ReminderList = {
        id: '789',
        title: 'Work & Personal (2024)',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      const result = await repository.createReminderList(
        'Work & Personal (2024)',
      );

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create-list',
        '--name',
        'Work & Personal (2024)',
      ]);
      expect(result).toEqual(mockResult);
    });

    it('should propagate CLI errors', async () => {
      mockExecuteCli.mockRejectedValue(
        new Error('No calendar source available.'),
      );

      await expect(repository.createReminderList('Test')).rejects.toThrow(
        'No calendar source available.',
      );
    });
  });

  describe('updateReminderList', () => {
    it('should update reminder list', async () => {
      const mockResult: ReminderList = { id: '456', title: 'Updated List' };

      mockExecuteCli.mockResolvedValue(mockResult);

      const result = await repository.updateReminderList(
        'Old Name',
        'New Name',
      );

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update-list',
        '--name',
        'Old Name',
        '--newName',
        'New Name',
      ]);
      expect(result).toBe(mockResult);
    });
  });

  describe('deleteReminderList', () => {
    it('should delete reminder list', async () => {
      mockExecuteCli.mockResolvedValue(undefined);

      await repository.deleteReminderList('Test List');

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'delete-list',
        '--name',
        'Test List',
      ]);
    });
  });
});
