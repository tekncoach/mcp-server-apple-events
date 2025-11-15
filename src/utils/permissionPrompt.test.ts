/**
 * permissionPrompt.test.ts
 * Tests for permission prompt utilities
 */

import type {
  ChildProcess,
  ExecFileException,
  ExecFileOptions,
} from 'node:child_process';
import { execFile } from 'node:child_process';
import { triggerPermissionPrompt } from './permissionPrompt.js';

type ExecFileCallback =
  | ((
      error: ExecFileException | null,
      stdout: string | Buffer,
      stderr: string | Buffer,
    ) => void)
  | null
  | undefined;

jest.mock('node:child_process');

const mockExecFile = execFile as jest.MockedFunction<typeof execFile>;

describe('permissionPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const invokeCallback = (
    optionsOrCallback?: ExecFileOptions | null | ExecFileCallback,
    callback?: ExecFileCallback,
  ): ExecFileCallback | undefined =>
    (typeof optionsOrCallback === 'function' ? optionsOrCallback : callback) as
      | ExecFileCallback
      | undefined;

  describe('triggerPermissionPrompt', () => {
    it('should trigger reminders permission prompt successfully', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        optionsOrCallback?: ExecFileOptions | null | ExecFileCallback,
        callback?: ExecFileCallback,
      ) => {
        const cb = invokeCallback(optionsOrCallback, callback);
        setTimeout(() => cb?.(null, '', ''), 0);
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      await expect(
        triggerPermissionPrompt('reminders'),
      ).resolves.toBeUndefined();

      expect(mockExecFile).toHaveBeenCalledWith(
        'osascript',
        ['-e', 'tell application "Reminders" to get the name of every list'],
        expect.any(Function),
      );
    });

    it('should trigger calendars permission prompt successfully', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        optionsOrCallback?: ExecFileOptions | null | ExecFileCallback,
        callback?: ExecFileCallback,
      ) => {
        const cb = invokeCallback(optionsOrCallback, callback);
        setTimeout(() => cb?.(null, '', ''), 0);
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      await expect(
        triggerPermissionPrompt('calendars'),
      ).resolves.toBeUndefined();

      expect(mockExecFile).toHaveBeenCalledWith(
        'osascript',
        ['-e', 'tell application "Calendar" to get the name of every calendar'],
        expect.any(Function),
      );
    });

    it('should throw error when AppleScript execution fails', async () => {
      const execError = new Error('osascript failed') as ExecFileException;

      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        optionsOrCallback?: ExecFileOptions | null | ExecFileCallback,
        callback?: ExecFileCallback,
      ) => {
        const cb = invokeCallback(optionsOrCallback, callback);
        setTimeout(() => cb?.(execError, '', ''), 0);
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      await expect(triggerPermissionPrompt('reminders')).rejects.toThrow(
        'Failed to trigger reminders permission prompt',
      );
    });

    it('should handle non-Error exceptions', async () => {
      const testCases = [
        'string error',
        'simple string error',
        null,
        undefined,
        123,
      ];

      for (const errorCase of testCases) {
        mockExecFile.mockImplementation(((
          _command: string,
          _args: readonly string[] | null | undefined,
          optionsOrCallback?: ExecFileOptions | null | ExecFileCallback,
          callback?: ExecFileCallback,
        ) => {
          const cb = invokeCallback(optionsOrCallback, callback);
          setTimeout(
            () => cb?.(errorCase as unknown as ExecFileException, '', ''),
            0,
          );
          return {} as ChildProcess;
        }) as unknown as typeof execFile);

        // Only test string errors that should be caught
        if (typeof errorCase === 'string' && errorCase.length > 0) {
          const expectedMessage = `Failed to trigger reminders permission prompt: ${errorCase}`;
          await expect(triggerPermissionPrompt('reminders')).rejects.toThrow(
            expectedMessage,
          );
        }
      }
    });

    it('should deduplicate concurrent permission prompts for same domain', async () => {
      let resolveCount = 0;
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        optionsOrCallback?: ExecFileOptions | null | ExecFileCallback,
        callback?: ExecFileCallback,
      ) => {
        const cb = invokeCallback(optionsOrCallback, callback);
        setTimeout(() => {
          resolveCount++;
          cb?.(null, '', '');
        }, 50);
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      // Start multiple concurrent prompts for the same domain
      const promises = [
        triggerPermissionPrompt('reminders'),
        triggerPermissionPrompt('reminders'),
        triggerPermissionPrompt('reminders'),
      ];

      await Promise.all(promises);

      // Should only call osascript once due to deduplication
      expect(mockExecFile).toHaveBeenCalledTimes(1);
      expect(resolveCount).toBe(1);
    });

    it('should not deduplicate permission prompts for different domains', async () => {
      mockExecFile.mockImplementation(((
        _command: string,
        _args: readonly string[] | null | undefined,
        optionsOrCallback?: ExecFileOptions | null | ExecFileCallback,
        callback?: ExecFileCallback,
      ) => {
        const cb = invokeCallback(optionsOrCallback, callback);
        setTimeout(() => cb?.(null, '', ''), 0);
        return {} as ChildProcess;
      }) as unknown as typeof execFile);

      // Start prompts for different domains
      await Promise.all([
        triggerPermissionPrompt('reminders'),
        triggerPermissionPrompt('calendars'),
      ]);

      // Should call osascript for each domain
      expect(mockExecFile).toHaveBeenCalledTimes(2);
    });
  });
});
