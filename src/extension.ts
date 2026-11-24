import type MarkdownIt from 'markdown-it';
import type * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log(`[markdown-preview-fold] activated from ${context.extensionPath}`);

  // The built-in Markdown extension calls this once per markdown-it instance.
  return {
    extendMarkdownIt(md: MarkdownIt): MarkdownIt {
      console.log('[markdown-preview-fold] extendMarkdownIt');
      return md;
    },
  };
}
