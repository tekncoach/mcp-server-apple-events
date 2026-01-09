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

    it('should map recurrence with daysOfWeek (weekdays)', async () => {
      const mockReminders = [
        {
          id: 'rec-weekdays',
          title: 'Weekday Reminder',
          isCompleted: false,
          list: 'Work',
          geofence: null,
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
            ],
            daysOfMonth: null,
            monthsOfYear: null,
            weeksOfYear: null,
            daysOfYear: null,
            setPositions: null,
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
        interval: 1,
        daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      });
    });

    it('should map recurrence with daysOfMonth (1st and 15th)', async () => {
      const mockReminders = [
        {
          id: 'rec-monthly-days',
          title: 'Monthly Days Reminder',
          isCompleted: false,
          list: 'Personal',
          geofence: null,
          recurrence: {
            frequency: 'monthly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: null,
            daysOfMonth: [1, 15],
            monthsOfYear: null,
            weeksOfYear: null,
            daysOfYear: null,
            setPositions: null,
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
        daysOfMonth: [1, 15],
      });
    });

    it('should map recurrence with monthsOfYear (quarterly)', async () => {
      const mockReminders = [
        {
          id: 'rec-quarterly',
          title: 'Quarterly Reminder',
          isCompleted: false,
          list: 'Work',
          geofence: null,
          recurrence: {
            frequency: 'yearly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: null,
            daysOfMonth: null,
            monthsOfYear: [1, 4, 7, 10],
            weeksOfYear: null,
            daysOfYear: null,
            setPositions: null,
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
        frequency: 'yearly',
        interval: 1,
        monthsOfYear: [1, 4, 7, 10],
      });
    });

    it('should map recurrence with setPositions (first Monday)', async () => {
      const mockReminders = [
        {
          id: 'rec-first-monday',
          title: 'First Monday Reminder',
          isCompleted: false,
          list: 'Personal',
          geofence: null,
          recurrence: {
            frequency: 'monthly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: ['monday'],
            daysOfMonth: null,
            monthsOfYear: null,
            weeksOfYear: null,
            daysOfYear: null,
            setPositions: [1],
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
        daysOfWeek: ['monday'],
        setPositions: [1],
      });
    });

    it('should map recurrence with last Friday (setPositions -1)', async () => {
      const mockReminders = [
        {
          id: 'rec-last-friday',
          title: 'Last Friday Reminder',
          isCompleted: false,
          list: 'Work',
          geofence: null,
          recurrence: {
            frequency: 'monthly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: ['friday'],
            daysOfMonth: null,
            monthsOfYear: null,
            weeksOfYear: null,
            daysOfYear: null,
            setPositions: [-1],
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
        daysOfWeek: ['friday'],
        setPositions: [-1],
      });
    });

    it('should map recurrence with weeksOfYear', async () => {
      const mockReminders = [
        {
          id: 'rec-weeks',
          title: 'Specific Weeks Reminder',
          isCompleted: false,
          list: 'Work',
          geofence: null,
          recurrence: {
            frequency: 'yearly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: null,
            daysOfMonth: null,
            monthsOfYear: null,
            weeksOfYear: [1, 26, 52],
            daysOfYear: null,
            setPositions: null,
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
        frequency: 'yearly',
        interval: 1,
        weeksOfYear: [1, 26, 52],
      });
    });

    it('should map recurrence with daysOfYear (first and last day)', async () => {
      const mockReminders = [
        {
          id: 'rec-days-year',
          title: 'First and Last Day Reminder',
          isCompleted: false,
          list: 'Personal',
          geofence: null,
          recurrence: {
            frequency: 'yearly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: null,
            daysOfMonth: null,
            monthsOfYear: null,
            weeksOfYear: null,
            daysOfYear: [1, -1],
            setPositions: null,
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
        frequency: 'yearly',
        interval: 1,
        daysOfYear: [1, -1],
      });
    });

    it('should map unknown day of week to monday', async () => {
      const mockReminders = [
        {
          id: 'rec-unknown-day',
          title: 'Unknown Day Reminder',
          isCompleted: false,
          list: 'Default',
          geofence: null,
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: ['unknown', 'monday'],
            daysOfMonth: null,
            monthsOfYear: null,
            weeksOfYear: null,
            daysOfYear: null,
            setPositions: null,
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].recurrence?.daysOfWeek).toEqual(['monday', 'monday']);
    });

    it('should handle all valid days of week', async () => {
      const mockReminders = [
        {
          id: 'rec-all-days',
          title: 'All Days Reminder',
          isCompleted: false,
          list: 'Default',
          geofence: null,
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: [
              'sunday',
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
            ],
            daysOfMonth: null,
            monthsOfYear: null,
            weeksOfYear: null,
            daysOfYear: null,
            setPositions: null,
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      expect(result[0].recurrence?.daysOfWeek).toEqual([
        'sunday',
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
      ]);
    });

    it('should handle empty arrays as no values', async () => {
      const mockReminders = [
        {
          id: 'rec-empty-arrays',
          title: 'Empty Arrays Reminder',
          isCompleted: false,
          list: 'Default',
          geofence: null,
          recurrence: {
            frequency: 'weekly',
            interval: 1,
            endDate: null,
            occurrenceCount: null,
            daysOfWeek: [],
            daysOfMonth: [],
            monthsOfYear: [],
            weeksOfYear: [],
            daysOfYear: [],
            setPositions: [],
          },
        },
      ];

      mockExecuteCli.mockResolvedValue({
        reminders: mockReminders,
        lists: [],
      });
      mockApplyReminderFilters.mockImplementation((reminders) => reminders);

      const result = await repository.findReminders();

      // Empty arrays should not be included in the result
      expect(result[0].recurrence).toEqual({
        frequency: 'weekly',
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

    it('should create reminder with daysOfWeek (weekdays)', async () => {
      const data = {
        title: 'Weekday Reminder',
        recurrenceFrequency: 'weekly' as const,
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [
          'monday' as const,
          'tuesday' as const,
          'wednesday' as const,
          'thursday' as const,
          'friday' as const,
        ],
      };
      const mockResult: Reminder = {
        id: '1001',
        title: 'Weekday Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Weekday Reminder',
        '--recurrenceFrequency',
        'weekly',
        '--recurrenceInterval',
        '1',
        '--recurrenceDaysOfWeek',
        'monday,tuesday,wednesday,thursday,friday',
      ]);
    });

    it('should create reminder with daysOfMonth', async () => {
      const data = {
        title: 'Bimonthly Reminder',
        recurrenceFrequency: 'monthly' as const,
        recurrenceInterval: 1,
        recurrenceDaysOfMonth: [1, 15],
      };
      const mockResult: Reminder = {
        id: '1002',
        title: 'Bimonthly Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Bimonthly Reminder',
        '--recurrenceFrequency',
        'monthly',
        '--recurrenceInterval',
        '1',
        '--recurrenceDaysOfMonth',
        '1,15',
      ]);
    });

    it('should create reminder with monthsOfYear (quarterly)', async () => {
      const data = {
        title: 'Quarterly Reminder',
        recurrenceFrequency: 'yearly' as const,
        recurrenceInterval: 1,
        recurrenceMonthsOfYear: [1, 4, 7, 10],
      };
      const mockResult: Reminder = {
        id: '1003',
        title: 'Quarterly Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Quarterly Reminder',
        '--recurrenceFrequency',
        'yearly',
        '--recurrenceInterval',
        '1',
        '--recurrenceMonthsOfYear',
        '1,4,7,10',
      ]);
    });

    it('should create reminder with setPositions (first Monday)', async () => {
      const data = {
        title: 'First Monday Reminder',
        recurrenceFrequency: 'monthly' as const,
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: ['monday' as const],
        recurrenceSetPositions: [1],
      };
      const mockResult: Reminder = {
        id: '1004',
        title: 'First Monday Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'First Monday Reminder',
        '--recurrenceFrequency',
        'monthly',
        '--recurrenceInterval',
        '1',
        '--recurrenceDaysOfWeek',
        'monday',
        '--recurrenceSetPositions',
        '1',
      ]);
    });

    it('should create reminder with last Friday (setPositions -1)', async () => {
      const data = {
        title: 'Last Friday Reminder',
        recurrenceFrequency: 'monthly' as const,
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: ['friday' as const],
        recurrenceSetPositions: [-1],
      };
      const mockResult: Reminder = {
        id: '1005',
        title: 'Last Friday Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Last Friday Reminder',
        '--recurrenceFrequency',
        'monthly',
        '--recurrenceInterval',
        '1',
        '--recurrenceDaysOfWeek',
        'friday',
        '--recurrenceSetPositions',
        '-1',
      ]);
    });

    it('should create reminder with weeksOfYear', async () => {
      const data = {
        title: 'Specific Weeks Reminder',
        recurrenceFrequency: 'yearly' as const,
        recurrenceInterval: 1,
        recurrenceWeeksOfYear: [1, 26, 52],
      };
      const mockResult: Reminder = {
        id: '1006',
        title: 'Specific Weeks Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'Specific Weeks Reminder',
        '--recurrenceFrequency',
        'yearly',
        '--recurrenceInterval',
        '1',
        '--recurrenceWeeksOfYear',
        '1,26,52',
      ]);
    });

    it('should create reminder with daysOfYear (first and last day)', async () => {
      const data = {
        title: 'First and Last Day Reminder',
        recurrenceFrequency: 'yearly' as const,
        recurrenceInterval: 1,
        recurrenceDaysOfYear: [1, -1],
      };
      const mockResult: Reminder = {
        id: '1007',
        title: 'First and Last Day Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'create',
        '--title',
        'First and Last Day Reminder',
        '--recurrenceFrequency',
        'yearly',
        '--recurrenceInterval',
        '1',
        '--recurrenceDaysOfYear',
        '1,-1',
      ]);
    });

    it('should not include empty arrays in CLI args', async () => {
      const data = {
        title: 'No Empty Arrays Reminder',
        recurrenceFrequency: 'weekly' as const,
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [] as (
          | 'monday'
          | 'tuesday'
          | 'wednesday'
          | 'thursday'
          | 'friday'
          | 'saturday'
          | 'sunday'
        )[],
        recurrenceDaysOfMonth: [] as number[],
      };
      const mockResult: Reminder = {
        id: '1008',
        title: 'No Empty Arrays Reminder',
        isCompleted: false,
        list: 'Default',
      };

      mockExecuteCli.mockResolvedValue(mockResult);

      await repository.createReminder(data);

      const args = mockExecuteCli.mock.calls[0][0];
      expect(args).not.toContain('--recurrenceDaysOfWeek');
      expect(args).not.toContain('--recurrenceDaysOfMonth');
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

    it('should update reminder with daysOfWeek (weekdays)', async () => {
      const data = {
        id: 'rec-weekdays',
        recurrenceFrequency: 'weekly' as const,
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [
          'monday' as const,
          'tuesday' as const,
          'wednesday' as const,
          'thursday' as const,
          'friday' as const,
        ],
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-weekdays' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-weekdays',
        '--recurrenceFrequency',
        'weekly',
        '--recurrenceInterval',
        '1',
        '--recurrenceDaysOfWeek',
        'monday,tuesday,wednesday,thursday,friday',
      ]);
    });

    it('should update reminder with daysOfMonth', async () => {
      const data = {
        id: 'rec-monthly',
        recurrenceFrequency: 'monthly' as const,
        recurrenceDaysOfMonth: [1, 15, -1],
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-monthly' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-monthly',
        '--recurrenceFrequency',
        'monthly',
        '--recurrenceDaysOfMonth',
        '1,15,-1',
      ]);
    });

    it('should update reminder with monthsOfYear', async () => {
      const data = {
        id: 'rec-yearly',
        recurrenceFrequency: 'yearly' as const,
        recurrenceMonthsOfYear: [1, 6, 12],
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-yearly' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-yearly',
        '--recurrenceFrequency',
        'yearly',
        '--recurrenceMonthsOfYear',
        '1,6,12',
      ]);
    });

    it('should update reminder with setPositions', async () => {
      const data = {
        id: 'rec-positions',
        recurrenceFrequency: 'monthly' as const,
        recurrenceDaysOfWeek: ['monday' as const],
        recurrenceSetPositions: [1, -1],
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-positions' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-positions',
        '--recurrenceFrequency',
        'monthly',
        '--recurrenceDaysOfWeek',
        'monday',
        '--recurrenceSetPositions',
        '1,-1',
      ]);
    });

    it('should update reminder with weeksOfYear', async () => {
      const data = {
        id: 'rec-weeks',
        recurrenceFrequency: 'yearly' as const,
        recurrenceWeeksOfYear: [1, 26],
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-weeks' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-weeks',
        '--recurrenceFrequency',
        'yearly',
        '--recurrenceWeeksOfYear',
        '1,26',
      ]);
    });

    it('should update reminder with daysOfYear', async () => {
      const data = {
        id: 'rec-days',
        recurrenceFrequency: 'yearly' as const,
        recurrenceDaysOfYear: [1, 180, -1],
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-days' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-days',
        '--recurrenceFrequency',
        'yearly',
        '--recurrenceDaysOfYear',
        '1,180,-1',
      ]);
    });

    it('should update reminder with all advanced recurrence fields', async () => {
      const data = {
        id: 'rec-full',
        recurrenceFrequency: 'monthly' as const,
        recurrenceInterval: 2,
        recurrenceEndDate: '2026-12-31',
        recurrenceOccurrenceCount: 24,
        recurrenceDaysOfWeek: ['monday' as const, 'friday' as const],
        recurrenceDaysOfMonth: [1, 15],
        recurrenceMonthsOfYear: [1, 4, 7, 10],
        recurrenceWeeksOfYear: [1, 52],
        recurrenceDaysOfYear: [1, -1],
        recurrenceSetPositions: [1, -1],
      };

      mockExecuteCli.mockResolvedValue({ id: 'rec-full' });

      await repository.updateReminder(data);

      expect(mockExecuteCli).toHaveBeenCalledWith([
        '--action',
        'update',
        '--id',
        'rec-full',
        '--recurrenceFrequency',
        'monthly',
        '--recurrenceInterval',
        '2',
        '--recurrenceEndDate',
        '2026-12-31',
        '--recurrenceOccurrenceCount',
        '24',
        '--recurrenceDaysOfWeek',
        'monday,friday',
        '--recurrenceDaysOfMonth',
        '1,15',
        '--recurrenceMonthsOfYear',
        '1,4,7,10',
        '--recurrenceWeeksOfYear',
        '1,52',
        '--recurrenceDaysOfYear',
        '1,-1',
        '--recurrenceSetPositions',
        '1,-1',
      ]);
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
