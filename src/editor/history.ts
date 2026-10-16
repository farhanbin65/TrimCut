import type { EditorDocument } from './types.ts';
export interface EditSnapshot { document: EditorDocument; selection: string[] }
export interface EditCommand { label: string; before: EditSnapshot; after: EditSnapshot }
export interface History { past: EditCommand[]; future: EditCommand[] }
export const HISTORY_LIMIT = 120;
export const execute = (command: EditCommand) => command.after;
export const undo = (command: EditCommand) => command.before;
export function record(history: History, command: EditCommand): History {
  if (JSON.stringify(command.before.document) === JSON.stringify(command.after.document)) return history;
  return { past: [...history.past.slice(-(HISTORY_LIMIT - 1)), command], future: [] };
}
