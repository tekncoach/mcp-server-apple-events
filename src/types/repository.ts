/**
 * repository.ts
 * Shared type definitions for repository layer JSON interfaces
 */

/**
 * JSON interfaces matching the output from EventKitCLI
 */

export interface GeofenceJSON {
  title: string;
  latitude: number;
  longitude: number;
  radius: number;
  proximity: string;
}

export interface RecurrenceJSON {
  frequency: string;
  interval: number;
  endDate: string | null;
  occurrenceCount: number | null;
  daysOfWeek: string[] | null;
  daysOfMonth: number[] | null;
  monthsOfYear: number[] | null;
  weeksOfYear: number[] | null;
  daysOfYear: number[] | null;
  setPositions: number[] | null;
}

export interface ReminderJSON {
  id: string;
  title: string;
  isCompleted: boolean;
  list: string;
  notes: string | null;
  url: string | null;
  dueDate: string | null;
  priority: number | null;
  completionDate: string | null;
  geofence: GeofenceJSON | null;
  recurrence: RecurrenceJSON | null;
}

export interface ListJSON {
  id: string;
  title: string;
}

export interface EventJSON {
  id: string;
  title: string;
  calendar: string;
  startDate: string;
  endDate: string;
  notes: string | null;
  location: string | null;
  url: string | null;
  isAllDay: boolean;
}

export interface CalendarJSON {
  id: string;
  title: string;
}

/**
 * Read result interfaces
 */

export interface ReminderReadResult {
  lists: ListJSON[];
  reminders: ReminderJSON[];
}

export interface EventsReadResult {
  calendars: CalendarJSON[];
  events: EventJSON[];
}

/**
 * Data interfaces for repository methods
 */

export interface CreateReminderData {
  title: string;
  list?: string;
  notes?: string;
  url?: string;
  dueDate?: string;
  priority?: number;
  isCompleted?: boolean;
  geofenceTitle?: string;
  geofenceLatitude?: number;
  geofenceLongitude?: number;
  geofenceRadius?: number;
  geofenceProximity?: string;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
  recurrenceOccurrenceCount?: number;
  recurrenceDaysOfWeek?: string[];
  recurrenceDaysOfMonth?: number[];
  recurrenceMonthsOfYear?: number[];
  recurrenceWeeksOfYear?: number[];
  recurrenceDaysOfYear?: number[];
  recurrenceSetPositions?: number[];
}

export interface UpdateReminderData {
  id: string;
  newTitle?: string;
  list?: string;
  notes?: string;
  url?: string;
  isCompleted?: boolean;
  dueDate?: string;
  priority?: number;
  geofenceTitle?: string;
  geofenceLatitude?: number;
  geofenceLongitude?: number;
  geofenceRadius?: number;
  geofenceProximity?: string;
  recurrenceFrequency?: string;
  recurrenceInterval?: number;
  recurrenceEndDate?: string;
  recurrenceOccurrenceCount?: number;
  recurrenceDaysOfWeek?: string[];
  recurrenceDaysOfMonth?: number[];
  recurrenceMonthsOfYear?: number[];
  recurrenceWeeksOfYear?: number[];
  recurrenceDaysOfYear?: number[];
  recurrenceSetPositions?: number[];
  clearRecurrence?: boolean;
}

export interface CreateEventData {
  title: string;
  startDate: string;
  endDate: string;
  calendar?: string;
  notes?: string;
  location?: string;
  url?: string;
  isAllDay?: boolean;
}

export interface UpdateEventData {
  id: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  calendar?: string;
  notes?: string;
  location?: string;
  url?: string;
  isAllDay?: boolean;
}
