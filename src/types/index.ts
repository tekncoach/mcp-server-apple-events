/**
 * types/index.ts
 * Type definitions for the Apple Reminders MCP server
 */

/**
 * Reminder item interface
 */
export interface Reminder {
  id: string;
  title: string;
  dueDate?: string;
  notes?: string;
  url?: string; // Native URL field (currently limited by EventKit API)
  list: string;
  isCompleted: boolean;
  priority?: number; // 0 = none, 1-4 = high, 5 = medium, 6-9 = low
  completionDate?: string; // Date when reminder was completed (read-only)
}

/**
 * Reminder list interface
 */
export interface ReminderList {
  id: string;
  title: string;
}

/**
 * Calendar event interface
 */
export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  calendar: string;
  notes?: string;
  location?: string;
  url?: string;
  isAllDay: boolean;
}

/**
 * Calendar interface
 */
export interface Calendar {
  id: string;
  title: string;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  name: string;
  version: string;
}

/**
 * Shared type constants for better type safety and consistency
 */
export type ReminderAction = 'read' | 'create' | 'update' | 'delete';
export type ListAction = 'read' | 'create' | 'update' | 'delete';
export type CalendarAction = 'read' | 'create' | 'update' | 'delete';
export type CalendarsAction = 'read';
export type DueWithinOption =
  | 'today'
  | 'tomorrow'
  | 'this-week'
  | 'overdue'
  | 'no-date';

/**
 * Action constant arrays for enum validation
 */
export const REMINDER_ACTIONS: readonly ReminderAction[] = [
  'read',
  'create',
  'update',
  'delete',
] as const;

export const LIST_ACTIONS: readonly ListAction[] = [
  'read',
  'create',
  'update',
  'delete',
] as const;

export const CALENDAR_ACTIONS: readonly CalendarAction[] = [
  'read',
  'create',
  'update',
  'delete',
] as const;

export const DUE_WITHIN_OPTIONS: readonly DueWithinOption[] = [
  'today',
  'tomorrow',
  'this-week',
  'overdue',
  'no-date',
] as const;

/**
 * Base tool arguments interface
 */
interface BaseToolArgs {
  action: string;
}

/**
 * Tool argument types - keeping flexible for handler routing while maintaining type safety
 */
export interface RemindersToolArgs extends BaseToolArgs {
  action: ReminderAction;
  // ID parameter
  id?: string;
  // Filtering parameters (for list action)
  filterList?: string;
  showCompleted?: boolean;
  search?: string;
  dueWithin?: DueWithinOption;
  // Single item parameters
  title?: string;
  newTitle?: string;
  dueDate?: string;
  note?: string;
  url?: string;
  completed?: boolean;
  priority?: number; // 0 = none, 1-4 = high, 5 = medium, 6-9 = low
  // Target list for create/update operations
  targetList?: string;
}

export interface ListsToolArgs extends BaseToolArgs {
  action: ListAction;
  name?: string;
  newName?: string;
}

export interface CalendarToolArgs extends BaseToolArgs {
  action: CalendarAction;
  // ID parameter
  id?: string;
  // Filtering parameters (for read action)
  filterCalendar?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  // Single item parameters
  title?: string;
  note?: string;
  location?: string;
  url?: string;
  isAllDay?: boolean;
  // Target calendar for create/update operations
  targetCalendar?: string;
}

export interface CalendarsToolArgs extends BaseToolArgs {
  action: CalendarsAction;
}

/**
 * Prompt-related type exports for consumers that need to interact with the
 * structured MCP prompt registry.
 */
export type {
  DailyTaskOrganizerArgs,
  PromptArgsByName,
  PromptArgumentDefinition,
  PromptMessage,
  PromptMessageContent,
  PromptMetadata,
  PromptName,
  PromptResponse,
  PromptTemplate,
  ReminderReviewAssistantArgs,
  SmartReminderCreatorArgs,
  WeeklyPlanningWorkflowArgs,
} from './prompts.js';
