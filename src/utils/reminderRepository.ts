/**
 * reminderRepository.ts
 * Repository pattern implementation for reminder data access operations using EventKitCLI.
 */

import type { Geofence, Reminder, ReminderList } from '../types/index.js';
import type {
  CreateReminderData,
  ListJSON,
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
    return lists;
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

    return executeCli<ReminderJSON>(args);
  }

  async deleteReminder(id: string): Promise<void> {
    await executeCli<unknown>(['--action', 'delete', '--id', id]);
  }

  async createReminderList(name: string): Promise<ListJSON> {
    return executeCli<ListJSON>(['--action', 'create-list', '--name', name]);
  }

  async updateReminderList(
    currentName: string,
    newName: string,
  ): Promise<ListJSON> {
    return executeCli<ListJSON>([
      '--action',
      'update-list',
      '--name',
      currentName,
      '--newName',
      newName,
    ]);
  }

  async deleteReminderList(name: string): Promise<void> {
    await executeCli<unknown>(['--action', 'delete-list', '--name', name]);
  }
}

export const reminderRepository = new ReminderRepository();
