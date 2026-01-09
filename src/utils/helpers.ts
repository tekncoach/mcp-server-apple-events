/**
 * helpers.ts
 * General utility functions for common operations
 */

/**
 * CLI argument building utilities
 */

/**
 * Adds an optional string argument to the args array if the value is defined
 * Note: Empty strings are passed through to support signals like empty geofenceTitle for removal
 */
export function addOptionalArg(
  args: string[],
  flag: string,
  value: string | undefined,
): void {
  if (value !== undefined) {
    args.push(flag, value);
  }
}

/**
 * Adds an optional boolean argument to the args array if the value is defined
 */
export function addOptionalBooleanArg(
  args: string[],
  flag: string,
  value: boolean | undefined,
): void {
  if (value !== undefined) {
    args.push(flag, String(value));
  }
}

/**
 * Adds an optional number argument to the args array if the value is defined
 */
export function addOptionalNumberArg(
  args: string[],
  flag: string,
  value: number | undefined,
): void {
  if (value !== undefined) {
    args.push(flag, String(value));
  }
}

/**
 * Adds an optional string array argument to the args array as comma-separated values
 */
export function addOptionalStringArrayArg(
  args: string[],
  flag: string,
  value: string[] | undefined,
): void {
  if (value !== undefined && value.length > 0) {
    args.push(flag, value.join(','));
  }
}

/**
 * Adds an optional number array argument to the args array as comma-separated values
 */
export function addOptionalNumberArrayArg(
  args: string[],
  flag: string,
  value: number[] | undefined,
): void {
  if (value !== undefined && value.length > 0) {
    args.push(flag, value.map(String).join(','));
  }
}

/**
 * Type conversion utilities
 */

/**
 * Converts null values to undefined for optional fields
 * This is useful when converting from JSON (which uses null) to TypeScript types (which use undefined)
 */
export function nullToUndefined<T>(obj: T, fields: (keyof T)[]): T {
  const result = { ...obj } as Record<string, unknown>;
  for (const field of fields) {
    const fieldKey = String(field);
    if (result[fieldKey] === null) {
      result[fieldKey] = undefined;
    }
  }
  return result as T;
}

/**
 * String manipulation utilities
 */

/**
 * Formats multiline notes for markdown display by indenting continuation lines
 * Replaces newlines with newline + indentation to maintain proper formatting
 */
export function formatMultilineNotes(notes: string): string {
  return notes.replace(/\n/g, '\n    ');
}
