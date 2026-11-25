import { randomUUID } from 'node:crypto';
import type { MarkdownIt } from 'markdown-it';
import * as vscode from 'vscode';
import { CommandChannel } from './commands';
import { markerPlugin } from './markdownIt/marker';

export function activate(context: vscode.ExtensionContext) {
  const channel = new CommandChannel({
    refresh: () => vscode.commands.executeCommand('markdown.preview.refresh'),
    createId: randomUUID,
  });

  context.subscriptions.push(
    vscode.commands.registerCommand('markdownPreviewFold.collapseAll', () =>
      channel.send('collapseAll'),
    ),
    vscode.commands.registerCommand('markdownPreviewFold.expandAll', () =>
      channel.send('expandAll'),
    ),
    channel,
  );

  // The built-in Markdown extension calls this once per markdown-it instance.
  return {
    extendMarkdownIt(md: MarkdownIt): MarkdownIt {
      return md.use(markerPlugin, { getCommand: () => channel.current });
    },
  };
}
