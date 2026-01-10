/**
 * handlers/listHandlers.ts
 * Handlers for reminder list operations
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ListsToolArgs } from '../../types/index.js';
import { getListEmblem, parseEmblem } from '../../utils/applescriptList.js';
import { handleAsyncOperation } from '../../utils/errorHandling.js';
import { reminderRepository } from '../../utils/reminderRepository.js';
import {
  CreateReminderListSchema,
  DeleteReminderListSchema,
  UpdateReminderListSchema,
} from '../../validation/schemas.js';
import {
  extractAndValidateArgs,
  formatDeleteMessage,
  formatListMarkdown,
  formatSuccessMessage,
} from './shared.js';

export const handleReadReminderLists = async (): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const lists = await reminderRepository.findAllLists();

    // Fetch emblems for all lists in parallel
    const listsWithEmblems = await Promise.all(
      lists.map(async (list) => {
        const emblemStr = await getListEmblem(list.title);
        const icon = parseEmblem(emblemStr);
        return { ...list, icon };
      }),
    );

    return formatListMarkdown(
      'Reminder Lists',
      listsWithEmblems,
      (list) => {
        const iconPart = list.icon ? ` ${list.icon}` : '';
        const colorPart = list.color ? ` [${list.color}]` : '';
        return [`-${iconPart} ${list.title}${colorPart} (ID: ${list.id})`];
      },
      'No reminder lists found.',
    );
  }, 'read reminder lists');
};

export const handleCreateReminderList = async (
  args: ListsToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(
      args,
      CreateReminderListSchema,
    );
    const list = await reminderRepository.createReminderList(
      validatedArgs.name,
      validatedArgs.color,
    );
    return formatSuccessMessage('created', 'list', list.title, list.id);
  }, 'create reminder list');
};

export const handleUpdateReminderList = async (
  args: ListsToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(
      args,
      UpdateReminderListSchema,
    );
    const list = await reminderRepository.updateReminderList(
      validatedArgs.name,
      validatedArgs.newName,
      validatedArgs.color,
      validatedArgs.icon,
    );
    return formatSuccessMessage('updated', 'list', list.title, list.id);
  }, 'update reminder list');
};

export const handleDeleteReminderList = async (
  args: ListsToolArgs,
): Promise<CallToolResult> => {
  return handleAsyncOperation(async () => {
    const validatedArgs = extractAndValidateArgs(
      args,
      DeleteReminderListSchema,
    );
    await reminderRepository.deleteReminderList(validatedArgs.name);
    return formatDeleteMessage('list', validatedArgs.name, {
      useQuotes: true,
      useIdPrefix: false,
      usePeriod: true,
    });
  }, 'delete reminder list');
};
