// Runs inside a real VS Code through @vscode/test-cli (Mocha, TDD interface).
import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';

const EXTENSION_ID = 'antonburduzha.markdown-preview-fold';
const COMMANDS = ['markdownPreviewFold.collapseAll', 'markdownPreviewFold.expandAll'];

async function sample(): Promise<vscode.TextDocument> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  assert.ok(folder, 'test/fixtures is open as the workspace');
  return vscode.workspace.openTextDocument(vscode.Uri.joinPath(folder.uri, 'sample.md'));
}

async function render(input: vscode.TextDocument | string): Promise<string> {
  return vscode.commands.executeCommand<string>('markdown.api.render', input);
}

suite('Markdown Preview Fold', () => {
  test('activates and registers its commands', async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} is installed`);
    await extension.activate();
    assert.equal(extension.isActive, true);

    const commands = await vscode.commands.getCommands(true);
    for (const command of COMMANDS) assert.ok(commands.includes(command), command);
  });

  test('adds the document marker to preview renders', async () => {
    const document = await sample();
    const html = await render(document);
    assert.ok(
      html.startsWith('<div class="mdfold-meta" hidden data-doc="'),
      `starts with the marker: ${html.slice(0, 120)}`,
    );
    assert.ok(html.includes(document.uri.toString()), 'the marker names the document');
  });

  test('leaves plain string renders alone', async () => {
    const html = await render('# Title');
    assert.ok(!html.includes('mdfold-meta'), html);
  });

  test('delivers Collapse All with the next render', async () => {
    await vscode.commands.executeCommand('markdownPreviewFold.collapseAll');
    const html = await render(await sample());
    assert.match(html, /data-cmd="collapseAll:[0-9a-f-]{36}"/);
  });
});
