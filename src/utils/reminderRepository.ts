/**
 * reminderRepository.ts
 * Repository pattern implementation for reminder data access operations using EventKitCLI.
 */

import type { Reminder, ReminderList } from '../types/index.js';
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
  nullToUndefined,
} from './helpers.js';

class ReminderRepository {
  private mapReminder(reminder: ReminderJSON): Reminder {
    const normalizedReminder = nullToUndefined(reminder, [
      'notes',
      'url',
      'dueDate',
    ]) as Reminder;

    // Pass dueDate as-is from Swift CLI to avoid double timezone conversion
    if (reminder.dueDate) {
      normalizedReminder.dueDate = reminder.dueDate;
    } else {
      delete normalizedReminder.dueDate;
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
