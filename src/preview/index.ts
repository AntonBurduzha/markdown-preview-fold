// Runs inside the built-in Markdown preview (markdown.previewScripts).
// For now it only proves that the script loads and sees the preview's updates.

const root = document.querySelector('.markdown-body');
console.log('[markdown-preview-fold] preview script loaded', {
  readyState: document.readyState,
  blocks: root?.children.length,
});

window.addEventListener('vscode.markdown.updateContent', () => {
  console.log('[markdown-preview-fold] preview updated');
});
