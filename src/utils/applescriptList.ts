/**
 * applescriptList.ts
 * AppleScript-based operations for reminder lists (features not available in EventKit)
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Executes an AppleScript command and returns the result
 */
async function runAppleScript(script: string): Promise<string> {
  const { stdout } = await execFileAsync('osascript', ['-e', script]);
  return stdout.trim();
}

/**
 * Gets the emblem (icon) of a reminder list
 * @param listName - Name of the list
 * @returns Emblem JSON string like '{"Emoji" : "🎯"}' or null
 */
export async function getListEmblem(listName: string): Promise<string | null> {
  try {
    const escapedName = listName.replace(/"/g, '\\"');
    const script = `tell application "Reminders" to get emblem of list "${escapedName}"`;
    const result = await runAppleScript(script);
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Sets the emblem (icon) of a reminder list
 * @param listName - Name of the list
 * @param emoji - Emoji character to set as emblem (e.g., "🎯")
 */
export async function setListEmblem(
  listName: string,
  emoji: string,
): Promise<void> {
  const escapedName = listName.replace(/"/g, '\\"');
  const escapedEmoji = emoji.replace(/"/g, '\\"');
  // Format: {"Emoji" : "🎯"}
  const emblemJson = `{\\"Emoji\\" : \\"${escapedEmoji}\\"}`;
  const script = `tell application "Reminders" to set emblem of list "${escapedName}" to "${emblemJson}"`;
  await runAppleScript(script);
}

/**
 * Parses the emblem JSON string to extract the emoji
 * @param emblemStr - Emblem string like '{"Emoji" : "🎯"}'
 * @returns Extracted emoji or null
 */
export function parseEmblem(emblemStr: string | null): string | null {
  if (!emblemStr) return null;
  // Parse {"Emoji" : "🎯"} format
  const match = emblemStr.match(/"Emoji"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}
