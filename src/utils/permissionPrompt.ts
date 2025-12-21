/**
 * permissionPrompt.ts
 * Triggers macOS permission prompts via AppleScript fallbacks.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type PermissionDomain = 'reminders' | 'calendars';

const APPLESCRIPT_SNIPPETS: Record<PermissionDomain, string> = {
  reminders: 'tell application "Reminders" to get the name of every list',
  calendars: 'tell application "Calendar" to get the name of every calendar',
};

const promptedDomains = new Set<PermissionDomain>();

/**
 * Triggers the corresponding AppleScript to surface a macOS permission dialog.
 * Uses simple memoization to avoid spawning duplicate dialogs.
 */
export async function triggerPermissionPrompt(
  domain: PermissionDomain,
): Promise<void> {
  if (promptedDomains.has(domain)) {
    return;
  }

  const script = APPLESCRIPT_SNIPPETS[domain];

  try {
    await execFileAsync('osascript', ['-e', script]);
    promptedDomains.add(domain);
  } catch {
    promptedDomains.add(domain);
  }
}

export function hasBeenPrompted(domain: PermissionDomain): boolean {
  return promptedDomains.has(domain);
}

export function resetPromptedDomains(): void {
  promptedDomains.clear();
}
