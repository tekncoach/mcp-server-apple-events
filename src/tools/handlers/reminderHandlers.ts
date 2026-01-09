/**
 * handlers/reminderHandlers.ts
 * Handlers for reminder task operations
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type {
  Geofence,
  Recurrence,
  RemindersToolArgs,
} from '../../types/index.js';
import { handleAsyncOperation } from '../../utils/errorHandling.js';
import { formatMultilineNotes } from '../../utils/helpers.js';
import { reminderRepository } from '../../utils/reminderRepository.js';
import {
  CreateReminderSchema,
  DeleteReminderSchema,
  ReadRemindersSchema,
  UpdateReminderSchema,
} from '../../validation/schemas.js';
import {
  extractAndValidateArgs,
  formatDeleteMessage,
  formatListMarkdown,
  formatSuccessMessage,
} from './shared.js';

/**
 * Formats a geofence as a human-readable string
 */
const formatGeofence = (geofence: Geofence): string => {
  const action = geofence.proximity === 'leave' ? 'leaving' : 'arriving at';
  return `When ${action} "${geofence.title}" (${geofence.latitude.toFixed(4)}, ${geofence.longitude.toFixed(4)}, ${geofence.radius}m)`;
};

/**
 * Formats a recurrence as a human-readable string
 */
const formatRecurrence = (recurrence: Recurrence): string => {
  const parts: string[] = [];

  // Map frequency to singular/plural forms
  const frequencyMap: Record<string, { singular: string; plural: string }> = {
    daily: { singular: 'daily', plural: 'days' },
    weekly: { singular: 'weekly', plural: 'weeks' },
    monthly: { singular: 'monthly', plural: 'months' },
    yearly: { singular: 'yearly', plural: 'years' },
  };

  // Base frequency with interval
  const freqInfo = frequencyMap[recurrence.frequency] || {
    singular: recurrence.frequency,
    plural: recurrence.frequency,
  };
  const interval =
    recurrence.interval > 1 ? `Every ${recurrence.interval} ` : '';
  const frequency =
    recurrence.interval > 1 ? freqInfo.plural : freqInfo.singular;
  parts.push(`${interval}${frequency}`);

  // Days of week (e.g., "on Monday, Wednesday, Friday")
  if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    const days = recurrence.daysOfWeek.map(
      (d) => d.charAt(0).toUpperCase() + d.slice(1),
    );
    parts.push(`on ${days.join(', ')}`);
  }

  // Days of month (e.g., "on day 1, 15")
  if (recurrence.daysOfMonth && recurrence.daysOfMonth.length > 0) {
    const days = recurrence.daysOfMonth.map((d) =>
      d < 0 ? `${Math.abs(d)} from end` : String(d),
    );
    parts.push(`on day ${days.join(', ')}`);
  }

  // Months of year (e.g., "in Jan, Jun, Dec")
  if (recurrence.monthsOfYear && recurrence.monthsOfYear.length > 0) {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const months = recurrence.monthsOfYear.map((m) => monthNames[m - 1] || m);
    parts.push(`in ${months.join(', ')}`);
  }

  // Weeks of year
  if (recurrence.weeksOfYear && recurrence.weeksOfYear.length > 0) {
    parts.push(`in week ${recurrence.weeksOfYear.join(', ')}`);
  }

  // Days of year
  if (recurrence.daysOfYear && recurrence.daysOfYear.length > 0) {
    parts.push(`on year day ${recurrence.daysOfYear.join(', ')}`);
  }

  // Set positions (e.g., "1st, last")
  if (recurrence.setPositions && recurrence.setPositions.length > 0) {
    const positions = recurrence.setPositions.map((p) => {
      if (p === 1) return '1st';
      if (p === 2) return '2nd';
      if (p === 3) return '3rd';
      if (p === -1) return 'last';
      if (p === -2) return '2nd to last';
      if (p < 0) return `${Math.abs(p)}th from end`;
      return `${p}th`;
    });
    parts.push(`(${positions.join(', ')})`);
  }

  let result = parts.join(' ');

  // End condition
  if (recurrence.endDate) {
    result += ` until ${recurrence.endDate}`;
  } else if (recurrence.occurrenceCount) {
    result += ` (${recurrence.occurrenceCount} times)`;
  }

  return result;
};

/**
 * Formats a reminder object as markdown list items
 */
/**
 * Formats priority as human-readable text
 */
const formatPriority = (priority: number): string => {
  if (priority >= 1 && priority <= 4) return 'High';
  if (priority === 5) return 'Medium';
  if (priority >= 6 && priority <= 9) return 'Low';
  return 'None';
};

const formatReminderMarkdown = (reminder: {
  title: string;
  isCompleted: boolean;
  list?: string;
  id?: string;
  notes?: string;
  dueDate?: string;
  url?: string;
  priority?: number;
  completionDate?: string;
  geofence?: Geofence;
  recurrence?: Recurrence;
}): string[] => {
  const lines: string[] = [];
  const checkbox = reminder.isCompleted ? '[x]' : '[ ]';
  lines.push(`- ${checkbox} ${reminder.title}`);
  if (reminder.list) lines.push(`  - List: ${reminder.list}`);
  if (reminder.id) lines.push(`  - ID: ${reminder.id}`);
  if (reminder.priority && reminder.priority > 0)
    lines.push(`  - Priority: ${formatPriority(reminder.priority)}`);
  if (reminder.notes)
    lines.push(`  - Notes: ${formatMultilineNotes(reminder.notes)}`);
  if (reminder.dueDate) lines.push(`  - Due: ${reminder.dueDate}`);
  if (reminder.recurrence)
    lines.push(`  - Repeats: ${formatRecurrence(reminder.recurrence)}`);
  if (reminder.completionDate)
    lines.push(`  - Completed: ${reminder.completionDate}`);
  if (reminder.geofence)
    lines.push(`  - Location: ${formatGeofence(reminder.geofence)}`);
  if (reminder.url) lines.push(`  - URL: ${reminder.url}`);
  return lines;
};

export const handleCreateReminder = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, CreateReminderSchema);
    const reminder = await reminderRepository.createReminder({
      title: validatedArgs.title,
      notes: validatedArgs.note,
      url: validatedArgs.url,
      list: validatedArgs.targetList,
      dueDate: validatedArgs.dueDate,
      priority: validatedArgs.priority,
      isCompleted: validatedArgs.completed,
      geofenceTitle: validatedArgs.geofenceTitle,
      geofenceLatitude: validatedArgs.geofenceLatitude,
      geofenceLongitude: validatedArgs.geofenceLongitude,
      geofenceRadius: validatedArgs.geofenceRadius,
      geofenceProximity: validatedArgs.geofenceProximity,
      recurrenceFrequency: validatedArgs.recurrenceFrequency,
      recurrenceInterval: validatedArgs.recurrenceInterval,
      recurrenceEndDate: validatedArgs.recurrenceEndDate,
      recurrenceOccurrenceCount: validatedArgs.recurrenceOccurrenceCount,
      recurrenceDaysOfWeek: validatedArgs.recurrenceDaysOfWeek,
      recurrenceDaysOfMonth: validatedArgs.recurrenceDaysOfMonth,
      recurrenceMonthsOfYear: validatedArgs.recurrenceMonthsOfYear,
      recurrenceWeeksOfYear: validatedArgs.recurrenceWeeksOfYear,
      recurrenceDaysOfYear: validatedArgs.recurrenceDaysOfYear,
      recurrenceSetPositions: validatedArgs.recurrenceSetPositions,
    });
    return formatSuccessMessage(
      'created',
      'reminder',
      reminder.title,
      reminder.id,
    );
  }, 'create reminder');
};

export const handleUpdateReminder = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, UpdateReminderSchema);
    const reminder = await reminderRepository.updateReminder({
      id: validatedArgs.id,
      newTitle: validatedArgs.title,
      notes: validatedArgs.note,
      url: validatedArgs.url,
      isCompleted: validatedArgs.completed,
      list: validatedArgs.targetList,
      dueDate: validatedArgs.dueDate,
      priority: validatedArgs.priority,
      geofenceTitle: validatedArgs.geofenceTitle,
      geofenceLatitude: validatedArgs.geofenceLatitude,
      geofenceLongitude: validatedArgs.geofenceLongitude,
      geofenceRadius: validatedArgs.geofenceRadius,
      geofenceProximity: validatedArgs.geofenceProximity,
      recurrenceFrequency: validatedArgs.recurrenceFrequency,
      recurrenceInterval: validatedArgs.recurrenceInterval,
      recurrenceEndDate: validatedArgs.recurrenceEndDate,
      recurrenceOccurrenceCount: validatedArgs.recurrenceOccurrenceCount,
      recurrenceDaysOfWeek: validatedArgs.recurrenceDaysOfWeek,
      recurrenceDaysOfMonth: validatedArgs.recurrenceDaysOfMonth,
      recurrenceMonthsOfYear: validatedArgs.recurrenceMonthsOfYear,
      recurrenceWeeksOfYear: validatedArgs.recurrenceWeeksOfYear,
      recurrenceDaysOfYear: validatedArgs.recurrenceDaysOfYear,
      recurrenceSetPositions: validatedArgs.recurrenceSetPositions,
      clearRecurrence: validatedArgs.clearRecurrence,
    });
    return formatSuccessMessage(
      'updated',
      'reminder',
      reminder.title,
      reminder.id,
    );
  }, 'update reminder');
};

export const handleDeleteReminder = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, DeleteReminderSchema);
    await reminderRepository.deleteReminder(validatedArgs.id);
    return formatDeleteMessage('reminder', validatedArgs.id, {
      useQuotes: false,
      useIdPrefix: true,
      usePeriod: false,
    });
  }, 'delete reminder');
};

export const handleReadReminders = async (
  args: RemindersToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(args, ReadRemindersSchema);

    // Check if id is provided in args (before validation)
    // because id might be filtered out by schema validation if it's optional
    if (args.id) {
      const reminder = await reminderRepository.findReminderById(args.id);
      const markdownLines: string[] = [
        '### Reminder',
        '',
        ...formatReminderMarkdown(reminder),
      ];
      return markdownLines.join('\n');
    }

    // Otherwise, return all matching reminders
    const reminders = await reminderRepository.findReminders({
      list: validatedArgs.filterList,
      showCompleted: validatedArgs.showCompleted,
      search: validatedArgs.search,
      dueWithin: validatedArgs.dueWithin,
    });

    return formatListMarkdown(
      'Reminders',
      reminders,
      formatReminderMarkdown,
      'No reminders found matching the criteria.',
    );
  }, 'read reminders');
};
