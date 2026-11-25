// What the extension host tells the preview script.
// The host can't message the built-in preview directly, so it renders this
// data into a hidden element at the top of the preview HTML.

export const META_CLASS = 'mdfold-meta';

export type FoldAction = 'collapseAll' | 'expandAll';

export interface FoldCommand {
  readonly action: FoldAction;
  /** Unique per command, so each preview applies a command only once. */
  readonly id: string;
}

export function isFoldAction(value: string): value is FoldAction {
  return value === 'collapseAll' || value === 'expandAll';
}

export function encodeCommand(command: FoldCommand): string {
  return `${command.action}:${command.id}`;
}

export function decodeCommand(value: string | null | undefined): FoldCommand | undefined {
  if (!value) return undefined;
  const separator = value.indexOf(':');
  if (separator === -1) return undefined;
  const action = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!isFoldAction(action) || id === '') return undefined;
  return { action, id };
}
