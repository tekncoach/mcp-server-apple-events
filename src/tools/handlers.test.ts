/**
 * tests/tools/handlers.test.ts
 * Tests for the refactored, Markdown-outputting tool handlers.
 */

import {
  handleCreateCalendarEvent,
  handleCreateReminder,
  handleCreateReminderList,
  handleDeleteCalendarEvent,
  handleDeleteReminder,
  handleDeleteReminderList,
  handleReadCalendarEvents,
  handleReadCalendars,
  handleReadReminderLists,
  handleReadReminders,
  handleUpdateCalendarEvent,
  handleUpdateReminder,
  handleUpdateReminderList,
} from '../tools/handlers/index.js';
import { calendarRepository } from '../utils/calendarRepository.js';
import { handleAsyncOperation } from '../utils/errorHandling.js';
import { reminderRepository } from '../utils/reminderRepository.js';

// Mock the cliExecutor to avoid import.meta issues
jest.mock('../utils/cliExecutor.js', () => ({
  executeCli: jest.fn(),
}));

// Mock the repository and error handling
jest.mock('../utils/reminderRepository.js');
jest.mock('../utils/calendarRepository.js');
jest.mock('../utils/errorHandling.js');

// Mock AppleScript list functions for emblem/icon support
jest.mock('../utils/applescriptList.js', () => ({
  getListEmblem: jest.fn().mockResolvedValue(null),
  parseEmblem: jest.fn().mockReturnValue(null),
}));

const mockReminderRepository = reminderRepository as jest.Mocked<
  typeof reminderRepository
>;
const mockCalendarRepository = calendarRepository as jest.Mocked<
  typeof calendarRepository
>;
const mockHandleAsyncOperation = handleAsyncOperation as jest.Mock;

/**
 * Type guard helper to extract text content from CallToolResult
 */
function _getTextContent(
  content: Array<{ type: string; [key: string]: unknown }>,
): string {
  const firstContent = content[0];
  if (firstContent && firstContent.type === 'text' && 'text' in firstContent) {
    return firstContent.text as string;
  }
  throw new Error('Expected text content');
}

// Simplified wrapper mock for testing. It mimics the real implementation.
mockHandleAsyncOperation.mockImplementation(async (operation) => {
  try {
    const result = await operation();
    return { content: [{ type: 'text', text: result }], isError: false };
  } catch (error) {
    return {
      content: [{ type: 'text', text: (error as Error).message }],
      isError: true,
    };
  }
});

describe('Tool Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- Reminder Handlers ---

  describe('handleReadReminders', () => {
    it('formats reminder collections with completion states and metadata', async () => {
      const mockReminders = [
        {
          id: '1',
          title: 'Basic Reminder',
          isCompleted: false,
          list: 'Personal',
          notes: 'Line 1\nLine 2',
          dueDate: '2024-01-15T10:00:00Z',
          url: 'https://example.com',
        },
        {
          id: '2',
          title: 'Full Reminder',
          isCompleted: true,
          list: 'Work',
          notes: 'Important note',
          dueDate: undefined,
          url: undefined,
        },
      ];
      mockReminderRepository.findReminders.mockResolvedValue(mockReminders);

      const result = await handleReadReminders({ action: 'read' });
      const content = _getTextContent(result.content);

      expect(content).toContain('### Reminders (Total: 2)');
      expect(content).toContain('- [ ] Basic Reminder');
      expect(content).toContain('- [x] Full Reminder');
      expect(content).toContain('- List: Personal');
      expect(content).toContain('- List: Work');
      expect(content).toContain('- Due: 2024-01-15T10:00:00Z');
      expect(content).toContain('- URL: https://example.com');
      expect(content).toContain('Notes: Line 1\n    Line 2');
    });

    it('renders single reminder details including metadata and completion state', async () => {
      const mockReminder = {
        id: '456',
        title: 'Completed Task',
        isCompleted: true,
        list: 'Done',
        notes: 'Some notes',
        dueDate: '2024-12-25',
        url: 'https://example.com',
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: '456',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('### Reminder');
      expect(content).toContain('- [x] Completed Task');
      expect(content).toContain('- List: Done');
      expect(content).toContain('- ID: 456');
      expect(content).toContain('- Notes: Some notes');
      expect(content).toContain('- Due: 2024-12-25');
      expect(content).toContain('- URL: https://example.com');
    });

    it('returns empty state messaging when no reminders match', async () => {
      mockReminderRepository.findReminders.mockResolvedValue([]);

      const result = await handleReadReminders({ action: 'read' });
      const content = _getTextContent(result.content);

      expect(content).toContain('### Reminders (Total: 0)');
      expect(content).toContain('No reminders found matching the criteria.');
    });

    it('formats reminder with geofence enter proximity', async () => {
      const mockReminder = {
        id: 'geo-1',
        title: 'Location Reminder',
        isCompleted: false,
        list: 'Personal',
        geofence: {
          title: 'Office',
          latitude: 48.8566,
          longitude: 2.3522,
          radius: 200,
          proximity: 'enter' as const,
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({ action: 'read', id: 'geo-1' });
      const content = _getTextContent(result.content);

      expect(content).toContain('- [ ] Location Reminder');
      expect(content).toContain(
        '- Location: When arriving at "Office" (48.8566, 2.3522, 200m)',
      );
    });

    it('formats reminder with geofence leave proximity', async () => {
      const mockReminder = {
        id: 'geo-2',
        title: 'Leave Reminder',
        isCompleted: false,
        list: 'Work',
        geofence: {
          title: 'Home',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
          proximity: 'leave' as const,
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({ action: 'read', id: 'geo-2' });
      const content = _getTextContent(result.content);

      expect(content).toContain(
        '- Location: When leaving "Home" (37.7749, -122.4194, 100m)',
      );
    });

    it('formats reminder list with mixed geofence reminders', async () => {
      const mockReminders = [
        {
          id: '1',
          title: 'No Location',
          isCompleted: false,
          list: 'Personal',
        },
        {
          id: '2',
          title: 'With Location',
          isCompleted: false,
          list: 'Work',
          geofence: {
            title: 'Gym',
            latitude: 40.7128,
            longitude: -74.006,
            radius: 150,
            proximity: 'enter' as const,
          },
        },
      ];
      mockReminderRepository.findReminders.mockResolvedValue(mockReminders);

      const result = await handleReadReminders({ action: 'read' });
      const content = _getTextContent(result.content);

      expect(content).toContain('- [ ] No Location');
      expect(content).not.toContain('No Location\n  - Location:');
      expect(content).toContain('- [ ] With Location');
      expect(content).toContain(
        '- Location: When arriving at "Gym" (40.7128, -74.0060, 150m)',
      );
    });

    it('formats reminder with basic daily recurrence', async () => {
      const mockReminder = {
        id: 'rec-1',
        title: 'Daily Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'daily' as const,
          interval: 1,
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({ action: 'read', id: 'rec-1' });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: daily');
    });

    it('formats reminder with weekly recurrence and interval > 1', async () => {
      const mockReminder = {
        id: 'rec-2',
        title: 'Biweekly Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'weekly' as const,
          interval: 2,
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({ action: 'read', id: 'rec-2' });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: Every 2 weeks');
    });

    it('formats reminder with daysOfWeek (weekdays)', async () => {
      const mockReminder = {
        id: 'rec-weekdays',
        title: 'Weekday Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'weekly' as const,
          interval: 1,
          daysOfWeek: [
            'monday' as const,
            'tuesday' as const,
            'wednesday' as const,
            'thursday' as const,
            'friday' as const,
          ],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-weekdays',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain(
        '- Repeats: weekly on Monday, Tuesday, Wednesday, Thursday, Friday',
      );
    });

    it('formats reminder with daysOfMonth', async () => {
      const mockReminder = {
        id: 'rec-monthly',
        title: 'Monthly Reminder',
        isCompleted: false,
        list: 'Personal',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfMonth: [1, 15],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-monthly',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on day 1, 15');
    });

    it('formats reminder with daysOfMonth negative (last day)', async () => {
      const mockReminder = {
        id: 'rec-last-day',
        title: 'Last Day Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfMonth: [-1],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-last-day',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on day 1 from end');
    });

    it('formats reminder with monthsOfYear', async () => {
      const mockReminder = {
        id: 'rec-quarterly',
        title: 'Quarterly Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'yearly' as const,
          interval: 1,
          monthsOfYear: [1, 4, 7, 10],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-quarterly',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: yearly in Jan, Apr, Jul, Oct');
    });

    it('formats reminder with setPositions (first Monday)', async () => {
      const mockReminder = {
        id: 'rec-first-monday',
        title: 'First Monday Reminder',
        isCompleted: false,
        list: 'Personal',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfWeek: ['monday' as const],
          setPositions: [1],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-first-monday',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on Monday (1st)');
    });

    it('formats reminder with setPositions (last Friday)', async () => {
      const mockReminder = {
        id: 'rec-last-friday',
        title: 'Last Friday Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfWeek: ['friday' as const],
          setPositions: [-1],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-last-friday',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on Friday (last)');
    });

    it('formats reminder with setPositions (2nd and 3rd)', async () => {
      const mockReminder = {
        id: 'rec-2nd-3rd',
        title: '2nd and 3rd Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfWeek: ['monday' as const],
          setPositions: [2, 3],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-2nd-3rd',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on Monday (2nd, 3rd)');
    });

    it('formats reminder with weeksOfYear', async () => {
      const mockReminder = {
        id: 'rec-weeks',
        title: 'Specific Weeks Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'yearly' as const,
          interval: 1,
          weeksOfYear: [1, 26, 52],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-weeks',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: yearly in week 1, 26, 52');
    });

    it('formats reminder with daysOfYear', async () => {
      const mockReminder = {
        id: 'rec-days-year',
        title: 'First and Last Day',
        isCompleted: false,
        list: 'Personal',
        recurrence: {
          frequency: 'yearly' as const,
          interval: 1,
          daysOfYear: [1, -1],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-days-year',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: yearly on year day 1, -1');
    });

    it('formats reminder with recurrence endDate', async () => {
      const mockReminder = {
        id: 'rec-end',
        title: 'Limited Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'weekly' as const,
          interval: 1,
          endDate: '2025-12-31',
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-end',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: weekly until 2025-12-31');
    });

    it('formats reminder with recurrence occurrenceCount', async () => {
      const mockReminder = {
        id: 'rec-count',
        title: '10 Times Reminder',
        isCompleted: false,
        list: 'Personal',
        recurrence: {
          frequency: 'daily' as const,
          interval: 1,
          occurrenceCount: 10,
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-count',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: daily (10 times)');
    });

    it('formats reminder with setPositions 2nd to last', async () => {
      const mockReminder = {
        id: 'rec-2nd-last',
        title: '2nd to Last Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfWeek: ['monday' as const],
          setPositions: [-2],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-2nd-last',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on Monday (2nd to last)');
    });

    it('formats reminder with setPositions 4th', async () => {
      const mockReminder = {
        id: 'rec-4th',
        title: '4th Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfWeek: ['wednesday' as const],
          setPositions: [4],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-4th',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on Wednesday (4th)');
    });

    it('formats reminder with setPositions 3rd from end', async () => {
      const mockReminder = {
        id: 'rec-3rd-end',
        title: '3rd from End Reminder',
        isCompleted: false,
        list: 'Work',
        recurrence: {
          frequency: 'monthly' as const,
          interval: 1,
          daysOfWeek: ['friday' as const],
          setPositions: [-3],
        },
      };
      mockReminderRepository.findReminderById.mockResolvedValue(mockReminder);

      const result = await handleReadReminders({
        action: 'read',
        id: 'rec-3rd-end',
      });
      const content = _getTextContent(result.content);

      expect(content).toContain('- Repeats: monthly on Friday (3th from end)');
    });
  });

  describe('handleCreateReminder', () => {
    it('should return a Markdown success message with ID', async () => {
      const newReminder = {
        id: 'rem-123',
        title: 'New Task',
        isCompleted: false,
        list: 'Inbox',
        notes: null,
        url: null,
        dueDate: null,
        priority: null,
        completionDate: null,
        geofence: null,
        recurrence: null,
      };
      mockReminderRepository.createReminder.mockResolvedValue(newReminder);
      const result = await handleCreateReminder({
        action: 'create',
        title: 'New Task',
      });
      const content = _getTextContent(result.content);
      expect(content).toContain('Successfully created reminder "New Task"');
      expect(content).toContain('- ID: rem-123');
    });

    it('should pass geofence params to repository', async () => {
      const newReminder = {
        id: 'geo-rem-123',
        title: 'Location Task',
        isCompleted: false,
        list: 'Inbox',
        notes: null,
        url: null,
        dueDate: null,
        priority: null,
        completionDate: null,
        geofence: {
          title: 'Office',
          latitude: 48.8566,
          longitude: 2.3522,
          radius: 200,
          proximity: 'enter',
        },
        recurrence: null,
      };
      mockReminderRepository.createReminder.mockResolvedValue(newReminder);

      await handleCreateReminder({
        action: 'create',
        title: 'Location Task',
        geofenceTitle: 'Office',
        geofenceLatitude: 48.8566,
        geofenceLongitude: 2.3522,
        geofenceRadius: 200,
        geofenceProximity: 'enter',
      });

      expect(mockReminderRepository.createReminder).toHaveBeenCalledWith({
        title: 'Location Task',
        notes: undefined,
        url: undefined,
        list: undefined,
        dueDate: undefined,
        geofenceTitle: 'Office',
        geofenceLatitude: 48.8566,
        geofenceLongitude: 2.3522,
        geofenceRadius: 200,
        geofenceProximity: 'enter',
      });
    });

    it('should create reminder with geofence using default radius', async () => {
      const newReminder = {
        id: 'geo-rem-456',
        title: 'Default Radius Task',
        isCompleted: false,
        list: 'Inbox',
        notes: null,
        url: null,
        dueDate: null,
        priority: null,
        completionDate: null,
        geofence: {
          title: 'Home',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
          proximity: 'leave',
        },
        recurrence: null,
      };
      mockReminderRepository.createReminder.mockResolvedValue(newReminder);

      await handleCreateReminder({
        action: 'create',
        title: 'Default Radius Task',
        geofenceTitle: 'Home',
        geofenceLatitude: 37.7749,
        geofenceLongitude: -122.4194,
        geofenceProximity: 'leave',
      });

      expect(mockReminderRepository.createReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          geofenceTitle: 'Home',
          geofenceLatitude: 37.7749,
          geofenceLongitude: -122.4194,
          geofenceProximity: 'leave',
          geofenceRadius: undefined,
        }),
      );
    });
  });

  describe('handleUpdateReminder', () => {
    it('should return a Markdown success message with ID', async () => {
      const updatedReminder = {
        id: 'rem-456',
        title: 'Updated Task',
        isCompleted: true,
        list: 'Inbox',
        notes: null,
        url: null,
        dueDate: null,
        priority: null,
        completionDate: null,
        geofence: null,
        recurrence: null,
      };
      mockReminderRepository.updateReminder.mockResolvedValue(updatedReminder);
      const result = await handleUpdateReminder({
        action: 'update',
        id: 'rem-456',
        title: 'Updated Task',
      });
      const content = _getTextContent(result.content);
      expect(content).toContain('Successfully updated reminder "Updated Task"');
      expect(content).toContain('- ID: rem-456');
    });

    it('should pass all geofence params to repository for full update', async () => {
      const updatedReminder = {
        id: 'geo-456',
        title: 'Geo Task',
        isCompleted: false,
        list: 'Inbox',
        notes: null,
        url: null,
        dueDate: null,
        priority: null,
        completionDate: null,
        geofence: {
          title: 'New Office',
          latitude: 40.7128,
          longitude: -74.006,
          radius: 300,
          proximity: 'leave',
        },
        recurrence: null,
      };
      mockReminderRepository.updateReminder.mockResolvedValue(updatedReminder);

      await handleUpdateReminder({
        action: 'update',
        id: 'geo-456',
        geofenceTitle: 'New Office',
        geofenceLatitude: 40.7128,
        geofenceLongitude: -74.006,
        geofenceRadius: 300,
        geofenceProximity: 'leave',
      });

      expect(mockReminderRepository.updateReminder).toHaveBeenCalledWith({
        id: 'geo-456',
        newTitle: undefined,
        notes: undefined,
        url: undefined,
        isCompleted: undefined,
        list: undefined,
        dueDate: undefined,
        geofenceTitle: 'New Office',
        geofenceLatitude: 40.7128,
        geofenceLongitude: -74.006,
        geofenceRadius: 300,
        geofenceProximity: 'leave',
      });
    });

    it('should pass partial geofence params for radius-only update', async () => {
      const updatedReminder = {
        id: 'geo-789',
        title: 'Partial Update Task',
        isCompleted: false,
        list: 'Work',
        notes: null,
        url: null,
        dueDate: null,
        priority: null,
        completionDate: null,
        geofence: {
          title: 'Office',
          latitude: 48.8566,
          longitude: 2.3522,
          radius: 500,
          proximity: 'enter',
        },
        recurrence: null,
      };
      mockReminderRepository.updateReminder.mockResolvedValue(updatedReminder);

      await handleUpdateReminder({
        action: 'update',
        id: 'geo-789',
        geofenceRadius: 500,
      });

      expect(mockReminderRepository.updateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'geo-789',
          geofenceRadius: 500,
          geofenceTitle: undefined,
          geofenceLatitude: undefined,
          geofenceLongitude: undefined,
          geofenceProximity: undefined,
        }),
      );
    });

    it('should pass partial geofence params for proximity-only update', async () => {
      const updatedReminder = {
        id: 'geo-101',
        title: 'Proximity Update Task',
        isCompleted: false,
        list: 'Personal',
        notes: null,
        url: null,
        dueDate: null,
        priority: null,
        completionDate: null,
        geofence: {
          title: 'Home',
          latitude: 37.7749,
          longitude: -122.4194,
          radius: 100,
          proximity: 'leave',
        },
        recurrence: null,
      };
      mockReminderRepository.updateReminder.mockResolvedValue(updatedReminder);

      await handleUpdateReminder({
        action: 'update',
        id: 'geo-101',
        geofenceProximity: 'leave',
      });

      expect(mockReminderRepository.updateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'geo-101',
          geofenceProximity: 'leave',
        }),
      );
    });

    it('should pass empty geofenceTitle for geofence removal', async () => {
      const updatedReminder = {
        id: 'geo-remove',
        title: 'Reminder without geofence',
        isCompleted: false,
        list: 'Work',
        notes: null,
        dueDate: null,
        url: null,
        priority: null,
        completionDate: null,
        geofence: null, // Geofence was removed
        recurrence: null,
      };
      mockReminderRepository.updateReminder.mockResolvedValue(updatedReminder);

      await handleUpdateReminder({
        action: 'update',
        id: 'geo-remove',
        geofenceTitle: '', // Empty string signals removal
      });

      expect(mockReminderRepository.updateReminder).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'geo-remove',
          geofenceTitle: '',
        }),
      );
    });
  });

  describe('handleDeleteReminder', () => {
    it('should return a Markdown success message', async () => {
      mockReminderRepository.deleteReminder.mockResolvedValue(undefined);
      const result = await handleDeleteReminder({
        action: 'delete',
        id: 'rem-789',
      });
      const content = _getTextContent(result.content);
      expect(content).toBe('Successfully deleted reminder with ID: rem-789');
    });
  });

  // --- List Handlers ---

  describe('handleReadReminderLists', () => {
    it('should return lists formatted as Markdown', async () => {
      const mockLists = [{ id: 'list-1', title: 'Inbox' }];
      mockReminderRepository.findAllLists.mockResolvedValue(mockLists);
      const result = await handleReadReminderLists();
      const content = _getTextContent(result.content);
      expect(content).toContain('### Reminder Lists (Total: 1)');
      expect(content).toContain('- Inbox (ID: list-1)');
    });

    it('should return empty list message when no lists found', async () => {
      mockReminderRepository.findAllLists.mockResolvedValue([]);
      const result = await handleReadReminderLists();
      const content = _getTextContent(result.content);
      expect(content).toContain('### Reminder Lists (Total: 0)');
      expect(content).toContain('No reminder lists found.');
    });

    it('should include icon when emblem is available', async () => {
      const { getListEmblem, parseEmblem } =
        require('../utils/applescriptList.js') as {
          getListEmblem: jest.Mock;
          parseEmblem: jest.Mock;
        };
      const mockLists = [
        { id: 'list-1', title: 'Work', color: '#FF0000' },
        { id: 'list-2', title: 'Personal', color: undefined },
      ];
      mockReminderRepository.findAllLists.mockResolvedValue(mockLists);
      getListEmblem.mockImplementation((name: string) =>
        name === 'Work'
          ? Promise.resolve('{"Emoji" : "💼"}')
          : Promise.resolve(null),
      );
      parseEmblem.mockImplementation((str: string | null) =>
        str === '{"Emoji" : "💼"}' ? '💼' : null,
      );

      const result = await handleReadReminderLists();
      const content = _getTextContent(result.content);

      expect(content).toContain('💼 Work');
      expect(content).toContain('[#FF0000]');
      expect(getListEmblem).toHaveBeenCalledWith('Work');
      expect(getListEmblem).toHaveBeenCalledWith('Personal');
    });
  });

  describe('handleCreateReminderList', () => {
    it('should return a Markdown success message with ID', async () => {
      const newList = { id: 'list-abc', title: 'New List', color: null };
      mockReminderRepository.createReminderList.mockResolvedValue(newList);
      const result = await handleCreateReminderList({
        action: 'create',
        name: 'New List',
      });
      const content = _getTextContent(result.content);
      expect(content).toContain('Successfully created list "New List"');
      expect(content).toContain('- ID: list-abc');
    });
  });

  describe('handleUpdateReminderList', () => {
    it('should return a Markdown success message with ID', async () => {
      const updatedList = {
        id: 'list-def',
        title: 'Updated Name',
        color: null,
      };
      mockReminderRepository.updateReminderList.mockResolvedValue(updatedList);
      const result = await handleUpdateReminderList({
        action: 'update',
        name: 'Old Name',
        newName: 'Updated Name',
      });
      const content = _getTextContent(result.content);
      expect(content).toContain('Successfully updated list to "Updated Name"');
      expect(content).toContain('- ID: list-def');
    });
  });

  describe('handleDeleteReminderList', () => {
    it('should return a Markdown success message', async () => {
      mockReminderRepository.deleteReminderList.mockResolvedValue(undefined);
      const result = await handleDeleteReminderList({
        action: 'delete',
        name: 'Old List',
      });
      const content = _getTextContent(result.content);
      expect(content).toBe('Successfully deleted list "Old List".');
    });
  });

  // --- Calendar Event Handlers ---

  describe('handleCreateCalendarEvent', () => {
    it('should return a success message with event ID', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'New Event',
        startDate: '2025-11-04T14:00:00+08:00',
        endDate: '2025-11-04T16:00:00+08:00',
        calendar: 'Work',
        notes: null,
        location: null,
        url: null,
        isAllDay: false,
      };
      mockCalendarRepository.createEvent.mockResolvedValue(mockEvent);
      const result = await handleCreateCalendarEvent({
        action: 'create',
        title: 'New Event',
        startDate: '2025-11-04 14:00:00',
        endDate: '2025-11-04 16:00:00',
        targetCalendar: 'Work',
      });
      const content = _getTextContent(result.content);
      expect(content).toContain('Successfully created event "New Event"');
      expect(content).toContain('- ID: event-123');
    });
  });

  describe('handleUpdateCalendarEvent', () => {
    it('should return a success message with event ID', async () => {
      const mockEvent = {
        id: 'event-456',
        title: 'Updated Event',
        startDate: '2025-11-04T15:00:00+08:00',
        endDate: '2025-11-04T17:00:00+08:00',
        calendar: 'Work',
        notes: null,
        location: null,
        url: null,
        isAllDay: false,
      };
      mockCalendarRepository.updateEvent.mockResolvedValue(mockEvent);
      const result = await handleUpdateCalendarEvent({
        action: 'update',
        id: 'event-456',
        title: 'Updated Event',
      });
      const content = _getTextContent(result.content);
      expect(content).toContain('Successfully updated event "Updated Event"');
      expect(content).toContain('- ID: event-456');
    });
  });

  describe('handleDeleteCalendarEvent', () => {
    it('should return a success message', async () => {
      mockCalendarRepository.deleteEvent.mockResolvedValue(undefined);
      const result = await handleDeleteCalendarEvent({
        action: 'delete',
        id: 'event-789',
      });
      const content = _getTextContent(result.content);
      expect(content).toBe('Successfully deleted event with ID "event-789".');
    });
  });

  describe('formatDeleteMessage', () => {
    it('should format message with default options', () => {
      const { formatDeleteMessage } = require('./handlers/shared.js');

      const result = formatDeleteMessage('reminder', '123');

      expect(result).toBe('Successfully deleted reminder with ID: "123".');
    });

    it('should format message without quotes', () => {
      const { formatDeleteMessage } = require('./handlers/shared.js');

      const result = formatDeleteMessage('event', 'event-456', {
        useQuotes: false,
      });

      expect(result).toBe('Successfully deleted event with ID: event-456.');
    });

    it('should format message without ID prefix', () => {
      const { formatDeleteMessage } = require('./handlers/shared.js');

      const result = formatDeleteMessage('list', 'My List', {
        useIdPrefix: false,
      });

      expect(result).toBe('Successfully deleted list "My List".');
    });

    it('should format message without period', () => {
      const { formatDeleteMessage } = require('./handlers/shared.js');

      const result = formatDeleteMessage('task', 'task-789', {
        usePeriod: false,
      });

      expect(result).toBe('Successfully deleted task with ID: "task-789"');
    });

    it('should format message with space separator instead of colon', () => {
      const { formatDeleteMessage } = require('./handlers/shared.js');

      const result = formatDeleteMessage('reminder', '123', {
        useColon: false,
      });

      expect(result).toBe('Successfully deleted reminder with ID "123".');
    });

    it('should format message with all options disabled', () => {
      const { formatDeleteMessage } = require('./handlers/shared.js');

      const result = formatDeleteMessage('item', 'identifier', {
        useQuotes: false,
        useIdPrefix: false,
        usePeriod: false,
        useColon: false,
      });

      expect(result).toBe('Successfully deleted item identifier');
    });
  });

  describe('handleReadCalendarEvents', () => {
    it('formats event collections with optional metadata', async () => {
      const mockEvents = [
        {
          id: 'evt-1',
          title: 'Minimal Event',
          calendar: 'Personal',
          startDate: '2025-11-15T08:00:00Z',
          endDate: '2025-11-15T09:00:00Z',
          isAllDay: false,
        },
        {
          id: 'evt-2',
          title: 'Full Event',
          calendar: 'Work',
          startDate: '2025-11-15T09:00:00Z',
          endDate: '2025-11-15T10:00:00Z',
          isAllDay: true,
          location: 'Conference Room',
          notes: 'Meeting notes',
          url: 'https://zoom.us/meeting',
        },
      ];
      mockCalendarRepository.findEvents.mockResolvedValue(mockEvents);

      const result = await handleReadCalendarEvents({ action: 'read' });
      const content = _getTextContent(result.content);

      expect(content).toContain('### Calendar Events (Total: 2)');
      expect(content).toContain('- Minimal Event');
      expect(content).toContain('- Full Event');
      expect(content).toContain('- Calendar: Work');
      expect(content).toContain('- Start: 2025-11-15T09:00:00Z');
      expect(content).toContain('- End: 2025-11-15T10:00:00Z');
      expect(content).toContain('- All Day: true');
      expect(content).toContain('- Location: Conference Room');
      expect(content).toContain('- Notes: Meeting notes');
      expect(content).toContain('- URL: https://zoom.us/meeting');
      expect(mockCalendarRepository.findAllCalendars).not.toHaveBeenCalled();
    });

    it('should return single event when id is provided', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'Single Event',
        startDate: '2025-11-04T14:00:00+08:00',
        endDate: '2025-11-04T16:00:00+08:00',
        calendar: 'Work',
        notes: 'Some notes',
        location: 'Office',
        url: 'https://example.com',
        isAllDay: false,
      };
      mockCalendarRepository.findEventById.mockResolvedValue(mockEvent);
      const result = await handleReadCalendarEvents({
        action: 'read',
        id: 'event-123',
      });
      const content = _getTextContent(result.content);
      expect(content).toContain('- Single Event');
      expect(content).toContain('- Calendar: Work');
      expect(content).toContain('- ID: event-123');
      expect(content).toContain('- Notes: Some notes');
      expect(content).toContain('- Location: Office');
      expect(content).toContain('- URL: https://example.com');
    });

    it('should return empty message when no events found', async () => {
      mockCalendarRepository.findEvents.mockResolvedValue([]);
      const result = await handleReadCalendarEvents({ action: 'read' });
      const content = _getTextContent(result.content);
      expect(content).toContain('### Calendar Events (Total: 0)');
      expect(content).toContain('No calendar events found.');
      expect(mockCalendarRepository.findAllCalendars).not.toHaveBeenCalled();
    });
  });

  describe('handleReadCalendars', () => {
    it('should return calendars formatted as Markdown', async () => {
      const mockCalendars = [
        { id: 'cal-1', title: 'Work' },
        { id: 'cal-2', title: 'Personal' },
      ];
      mockCalendarRepository.findAllCalendars.mockResolvedValue(mockCalendars);
      const result = await handleReadCalendars({ action: 'read' });
      const content = _getTextContent(result.content);
      expect(content).toContain('### Calendars (Total: 2)');
      expect(content).toContain('- Work (ID: cal-1)');
      expect(content).toContain('- Personal (ID: cal-2)');
    });

    it('should support being called without args', async () => {
      mockCalendarRepository.findAllCalendars.mockResolvedValue([]);
      const result = await handleReadCalendars();
      const content = _getTextContent(result.content);
      expect(content).toContain('### Calendars (Total: 0)');
      expect(content).toContain('No calendars found.');
    });
  });
});
