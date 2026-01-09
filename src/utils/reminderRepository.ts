/**
 * reminderRepository.ts
 * Repository pattern implementation for reminder data access operations using EventKitCLI.
 */

import type {
  DayOfWeek,
  Geofence,
  Recurrence,
  Reminder,
  ReminderList,
} from '../types/index.js';
import type {
  CreateReminderData,
  ListJSON,
  RecurrenceJSON,
  ReminderJSON,
  ReminderReadResult,
  UpdateReminderData,
} from '../types/repository.js';
import { executeCli } from './cliExecutor.js';
import type { ReminderFilters } from './dateFiltering.js';
import { applyReminderFilters } from './dateFiltering.js';
import {
  addOptionalArg,
  addOptionalBooleanArg,
  addOptionalNumberArg,
  addOptionalNumberArrayArg,
  addOptionalStringArrayArg,
  nullToUndefined,
} from './helpers.js';

class ReminderRepository {
  private mapGeofence(
    geofence: ReminderJSON['geofence'],
  ): Geofence | undefined {
    if (!geofence) return undefined;
    return {
      title: geofence.title,
      latitude: geofence.latitude,
      longitude: geofence.longitude,
      radius: geofence.radius,
      proximity: geofence.proximity === 'leave' ? 'leave' : 'enter',
    };
  }

  private mapDayOfWeek(day: string): DayOfWeek {
    const d = day.toLowerCase();
    if (
      d === 'sunday' ||
      d === 'monday' ||
      d === 'tuesday' ||
      d === 'wednesday' ||
      d === 'thursday' ||
      d === 'friday' ||
      d === 'saturday'
    ) {
      return d;
    }
    return 'monday';
  }

  private mapRecurrence(
    recurrence: RecurrenceJSON | null,
  ): Recurrence | undefined {
    if (!recurrence) return undefined;
    const freq = recurrence.frequency.toLowerCase();
    const frequency =
      freq === 'daily' ||
      freq === 'weekly' ||
      freq === 'monthly' ||
      freq === 'yearly'
        ? freq
        : 'daily';
    const result: Recurrence = {
      frequency,
      interval: recurrence.interval,
    };
    if (recurrence.endDate) result.endDate = recurrence.endDate;
    if (recurrence.occurrenceCount)
      result.occurrenceCount = recurrence.occurrenceCount;
    if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      result.daysOfWeek = recurrence.daysOfWeek.map((d) =>
        this.mapDayOfWeek(d),
      );
    }
    if (recurrence.daysOfMonth && recurrence.daysOfMonth.length > 0) {
      result.daysOfMonth = recurrence.daysOfMonth;
    }
    if (recurrence.monthsOfYear && recurrence.monthsOfYear.length > 0) {
      result.monthsOfYear = recurrence.monthsOfYear;
    }
    if (recurrence.weeksOfYear && recurrence.weeksOfYear.length > 0) {
      result.weeksOfYear = recurrence.weeksOfYear;
    }
    if (recurrence.daysOfYear && recurrence.daysOfYear.length > 0) {
      result.daysOfYear = recurrence.daysOfYear;
    }
    if (recurrence.setPositions && recurrence.setPositions.length > 0) {
      result.setPositions = recurrence.setPositions;
    }
    return result;
  }

  private mapReminder(reminder: ReminderJSON): Reminder {
    const normalizedReminder = nullToUndefined(reminder, [
      'notes',
      'url',
      'dueDate',
      'priority',
      'completionDate',
    ]) as Reminder;

    // Pass dueDate as-is from Swift CLI to avoid double timezone conversion
    if (reminder.dueDate) {
      normalizedReminder.dueDate = reminder.dueDate;
    } else {
      delete normalizedReminder.dueDate;
    }

    // Omit priority if 0 (means 'no priority')
    // nullToUndefined already handled null → undefined
    if (normalizedReminder.priority === 0) {
      delete normalizedReminder.priority;
    }

    // Pass completionDate as-is from Swift CLI
    if (reminder.completionDate) {
      normalizedReminder.completionDate = reminder.completionDate;
    } else {
      delete normalizedReminder.completionDate;
    }

    // Map geofence if present, otherwise remove null value
    const geofence = this.mapGeofence(reminder.geofence);
    if (geofence) {
      normalizedReminder.geofence = geofence;
    } else {
      delete normalizedReminder.geofence;
    }

    // Map recurrence if present, otherwise remove null value
    const recurrence = this.mapRecurrence(reminder.recurrence);
    if (recurrence) {
      normalizedReminder.recurrence = recurrence;
    } else {
      delete normalizedReminder.recurrence;
    }

    return normalizedReminder;
  }

  private mapReminders(reminders: ReminderJSON[]): Reminder[] {
    return reminders.map((reminder) => this.mapReminder(reminder));
  }

  private async readAll(): Promise<ReminderReadResult> {
    return executeCli<ReminderReadResult>([
      '--action',
      'read',
      '--showCompleted',
      'true',
    ]);
  }

  async findReminderById(id: string): Promise<Reminder> {
    const { reminders } = await this.readAll();
    const reminder = this.mapReminders(reminders).find((r) => r.id === id);
    if (!reminder) {
      throw new Error(`Reminder with ID '${id}' not found.`);
    }
    return reminder;
  }

  async findReminders(filters: ReminderFilters = {}): Promise<Reminder[]> {
    const { reminders } = await this.readAll();
    const normalizedReminders = this.mapReminders(reminders);
    return applyReminderFilters(normalizedReminders, filters);
  }

  async findAllLists(): Promise<ReminderList[]> {
    const { lists } = await this.readAll();
    return lists.map((list) => ({
      id: list.id,
      title: list.title,
      color: list.color ?? undefined,
    }));
  }

  async createReminder(data: CreateReminderData): Promise<ReminderJSON> {
    const args = ['--action', 'create', '--title', data.title];
    addOptionalArg(args, '--targetList', data.list);
    addOptionalArg(args, '--note', data.notes);
    addOptionalArg(args, '--url', data.url);
    addOptionalArg(args, '--dueDate', data.dueDate);
    addOptionalNumberArg(args, '--priority', data.priority);
    addOptionalBooleanArg(args, '--isCompleted', data.isCompleted);
    // Geofence parameters
    addOptionalArg(args, '--geofenceTitle', data.geofenceTitle);
    addOptionalNumberArg(args, '--geofenceLatitude', data.geofenceLatitude);
    addOptionalNumberArg(args, '--geofenceLongitude', data.geofenceLongitude);
    addOptionalNumberArg(args, '--geofenceRadius', data.geofenceRadius);
    addOptionalArg(args, '--geofenceProximity', data.geofenceProximity);
    // Recurrence parameters
    addOptionalArg(args, '--recurrenceFrequency', data.recurrenceFrequency);
    addOptionalNumberArg(args, '--recurrenceInterval', data.recurrenceInterval);
    addOptionalArg(args, '--recurrenceEndDate', data.recurrenceEndDate);
    addOptionalNumberArg(
      args,
      '--recurrenceOccurrenceCount',
      data.recurrenceOccurrenceCount,
    );
    addOptionalStringArrayArg(
      args,
      '--recurrenceDaysOfWeek',
      data.recurrenceDaysOfWeek,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceDaysOfMonth',
      data.recurrenceDaysOfMonth,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceMonthsOfYear',
      data.recurrenceMonthsOfYear,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceWeeksOfYear',
      data.recurrenceWeeksOfYear,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceDaysOfYear',
      data.recurrenceDaysOfYear,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceSetPositions',
      data.recurrenceSetPositions,
    );

    return executeCli<ReminderJSON>(args);
  }

  async updateReminder(data: UpdateReminderData): Promise<ReminderJSON> {
    const args = ['--action', 'update', '--id', data.id];
    addOptionalArg(args, '--title', data.newTitle);
    addOptionalArg(args, '--targetList', data.list);
    addOptionalArg(args, '--note', data.notes);
    addOptionalArg(args, '--url', data.url);
    addOptionalArg(args, '--dueDate', data.dueDate);
    addOptionalBooleanArg(args, '--isCompleted', data.isCompleted);
    addOptionalNumberArg(args, '--priority', data.priority);
    // Geofence parameters
    addOptionalArg(args, '--geofenceTitle', data.geofenceTitle);
    addOptionalNumberArg(args, '--geofenceLatitude', data.geofenceLatitude);
    addOptionalNumberArg(args, '--geofenceLongitude', data.geofenceLongitude);
    addOptionalNumberArg(args, '--geofenceRadius', data.geofenceRadius);
    addOptionalArg(args, '--geofenceProximity', data.geofenceProximity);
    // Recurrence parameters
    addOptionalArg(args, '--recurrenceFrequency', data.recurrenceFrequency);
    addOptionalNumberArg(args, '--recurrenceInterval', data.recurrenceInterval);
    addOptionalArg(args, '--recurrenceEndDate', data.recurrenceEndDate);
    addOptionalNumberArg(
      args,
      '--recurrenceOccurrenceCount',
      data.recurrenceOccurrenceCount,
    );
    addOptionalStringArrayArg(
      args,
      '--recurrenceDaysOfWeek',
      data.recurrenceDaysOfWeek,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceDaysOfMonth',
      data.recurrenceDaysOfMonth,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceMonthsOfYear',
      data.recurrenceMonthsOfYear,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceWeeksOfYear',
      data.recurrenceWeeksOfYear,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceDaysOfYear',
      data.recurrenceDaysOfYear,
    );
    addOptionalNumberArrayArg(
      args,
      '--recurrenceSetPositions',
      data.recurrenceSetPositions,
    );
    addOptionalBooleanArg(args, '--clearRecurrence', data.clearRecurrence);

    return executeCli<ReminderJSON>(args);
  }

  async deleteReminder(id: string): Promise<void> {
    await executeCli<unknown>(['--action', 'delete', '--id', id]);
  }

  async createReminderList(name: string, color?: string): Promise<ListJSON> {
    const args = ['--action', 'create-list', '--name', name];
    addOptionalArg(args, '--color', color);
    return executeCli<ListJSON>(args);
  }

  async updateReminderList(
    currentName: string,
    newName?: string,
    color?: string,
    icon?: string,
  ): Promise<ListJSON> {
    // Handle icon separately via AppleScript (not available in EventKit)
    if (icon) {
      const { setListEmblem } = await import('./applescriptList.js');
      await setListEmblem(currentName, icon);
    }

    // If only icon was updated, we still need to return the list info
    if (!newName && !color) {
      // Just fetch current list info
      const lists = await this.findAllLists();
      const list = lists.find((l) => l.title === currentName);
      if (!list) {
        throw new Error(`List '${currentName}' not found.`);
      }
      return { id: list.id, title: list.title, color: list.color ?? null };
    }

    const args = ['--action', 'update-list', '--name', currentName];
    addOptionalArg(args, '--newName', newName);
    addOptionalArg(args, '--color', color);
    return executeCli<ListJSON>(args);
  }

  async deleteReminderList(name: string): Promise<void> {
    await executeCli<unknown>(['--action', 'delete-list', '--name', name]);
  }
}

export const reminderRepository = new ReminderRepository();
