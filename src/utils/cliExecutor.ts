/**
 * @fileoverview Swift CLI execution and JSON response parsing
 * @module utils/cliExecutor
 * @description Executes the EventKitCLI binary for native macOS EventKit operations
 */

import type { ExecFileException } from 'node:child_process';
import { execFile } from 'node:child_process';
import path from 'node:path';
import {
  findSecureBinaryPath,
  getEnvironmentBinaryConfig,
} from './binaryValidator.js';
import { FILE_SYSTEM } from './constants.js';
import { findProjectRoot } from './projectUtils.js';

const execFilePromise = (
  cliPath: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> =>
  new Promise((resolve, reject) => {
    execFile(cliPath, args, (error, stdout, stderr) => {
      if (error) {
        const execError = error as ExecFileException & {
          stdout?: string | Buffer;
          stderr?: string | Buffer;
        };
        execError.stdout = stdout;
        execError.stderr = stderr;
        reject(execError);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

interface CliSuccessResponse<T> {
  status: 'success';
  result: T;
}

interface CliErrorResponse {
  status: 'error';
  message: string;
}

type CliResponse<T> = CliSuccessResponse<T> | CliErrorResponse;

/**
 * Calendar action strings used in Swift CLI (different from MCP tool action names)
 */

const bufferToString = (data?: string | Buffer | null): string | null => {
  if (typeof data === 'string') return data;
  if (Buffer.isBuffer(data)) return data.toString('utf8');
  return data == null ? null : String(data);
};

const parseCliOutput = <T>(output: string): T => {
  let parsed: CliResponse<T>;
  try {
    parsed = JSON.parse(output) as CliResponse<T>;
  } catch (_error) {
    throw new Error('EventKitCLI execution failed: Invalid CLI output');
  }

  if (parsed.status === 'success') {
    return parsed.result;
  }
  throw new Error(parsed.message);
};

const runCli = async <T>(cliPath: string, args: string[]): Promise<T> => {
  try {
    const { stdout } = await execFilePromise(cliPath, args);
    const normalized = bufferToString(stdout);
    if (!normalized) {
      throw new Error('EventKitCLI execution failed: Empty CLI output');
    }
    return parseCliOutput(normalized);
  } catch (error) {
    const execError = error as ExecFileException & {
      stdout?: string | Buffer;
    };
    const normalized = bufferToString(execError?.stdout);
    if (normalized) {
      return parseCliOutput(normalized);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`EventKitCLI execution failed: ${errorMessage}`);
  }
};

/**
 * Executes the EventKitCLI binary for native macOS EventKit operations
 * @template T - Expected return type from the Swift CLI
 * @param {string[]} args - Array of arguments to pass to the CLI
 * @returns {Promise<T>} Parsed JSON result from the CLI
 * @throws {Error} If binary not found, validation fails, or CLI execution fails
 * @description
 * - Locates binary using secure path validation
 * - Parses JSON response from Swift CLI
 * @example
 * const result = await executeCli<Reminder[]>(['--action', 'read', '--showCompleted', 'true']);
 */
export async function executeCli<T>(args: string[]): Promise<T> {
  const projectRoot = findProjectRoot();
  const binaryName = FILE_SYSTEM.SWIFT_BINARY_NAME;
  const possiblePaths = [path.join(projectRoot, 'bin', binaryName)];

  const config = {
    ...getEnvironmentBinaryConfig(),
    allowedPaths: [
      '/bin/',
      '/dist/swift/bin/',
      '/src/swift/bin/',
      '/swift/bin/',
    ],
  };

  const { path: cliPath } = findSecureBinaryPath(possiblePaths, config);

  if (!cliPath) {
    throw new Error(
      `EventKitCLI binary not found or validation failed. Searched: ${possiblePaths.join(', ')}`,
    );
  }

  return await runCli<T>(cliPath, args);
}
