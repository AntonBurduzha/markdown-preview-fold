# Decisions

Each decision has its context, the choice, and what follows from it. The spike in T02 checks the assumptions in a real editor. Its results are at the end.

## 001. Extend the built-in preview, not Cursor's inline editor

**Context.** Cursor has its own WYSIWYG Markdown editor (`markdownEditor.toggleMode`). It lives in Cursor's workbench code, not in an extension, so extensions have no API to it. The built-in VS Code preview (`markdown-language-features`) accepts preview scripts, preview styles and markdown-it plugins from other extensions.

**Decision.** Fold sections in the built-in preview.

**Consequences.** One extension works in VS Code, Cursor, VSCodium and Windsurf. In Cursor, users open the classic preview ("Markdown: Open Preview to the Side"). Previews owned by other extensions, such as Markdown Preview Enhanced, are out of reach.

## 002. Apply the state again after every preview update

**Context.** The preview patches `.markdown-body` with morphdom on every change. Elements we changed (a class, a caret) no longer equal the new HTML, so morphdom resets them. After patching, the preview dispatches `vscode.markdown.updateContent` on `window`.

**Decision.** Keep the state in the script, and make `renderView` idempotent. Run it on load and on every `vscode.markdown.updateContent`.

**Consequences.** No fight with morphdom, and no flicker: the patch and our render run in the same task, before the browser paints. The alternative, wrapping sections in `<details>` from a markdown-it plugin, would change the document structure for every user of the engine, and morphdom matches elements by position, so the `open` state could move to the wrong section after an edit.

## 003. Section keys come from the heading path

**Context.** The state must survive edits (requirement 2). Positions and line numbers change with every edit. The heading ids from the preview are slugs with numeric suffixes that shift across the whole document.

**Decision.** A key is the parent's key, the normalized heading text, and the index of that text among the parent's children: `Guide#0 › Setup#0`.

**Consequences.** Editing content keeps every key. Renaming a heading resets that section and its subsections. Adding a heading with the same text above a sibling with that text swaps their indexes. Both are listed in the README as known limitations.

## 004. Store the state in the preview's localStorage

**Context.** The built-in preview holds the only `acquireVsCodeApi()` handle, so `vscode.setState` isn't available to us. The preview isn't kept alive while hidden (no `retainContextWhenHidden`). The workbench gives each webview type a stable origin (`webviewOriginStore`), so its `localStorage` persists.

**Decision.** One versioned `localStorage` entry, keyed by document URI, capped at 200 documents. Every access is wrapped in `try/catch`.

**Consequences.** The state survives tab switches and restarts with no extension-host code. It stays on one machine and isn't synced. A sandbox without storage still gets folding for the session.

## 005. Add the marker in `renderer.render`

**Context.** The engine caches parsed tokens per document version. It passes `env.currentDocument` only to `renderer.render(tokens, options, env)`, and parses with an empty `env`.

**Decision.** Wrap `md.renderer.render` and prepend `<div class="mdfold-meta" hidden data-doc="…" data-cmd="…">`, only when `env.currentDocument` is set.

**Consequences.** The marker sees the document and the current command on every render, cached tokens or not. Plain string renders from other extensions (`markdown.api.render` with a string) get no marker.

## 006. Bulk commands go through the marker and `markdown.preview.refresh`

**Context.** Commands, menus and key bindings live in the extension host. The preview page can't receive messages from our extension.

**Decision.** A command stores `collapseAll:<uuid>` for 1.5 s and runs `markdown.preview.refresh`. The marker carries it into the next render. The page applies each id once, and ignores a command that's already there on its first render.

**Consequences.** Collapse All and Expand All work from the title bar, the Command Palette and `Cmd+K Cmd+0` / `Cmd+K Cmd+J`. They act on every open preview, because the host can't tell which one is focused. The fallback, if the spike had failed, was a small toolbar inside the preview.

## 007. Hidden blocks leave scroll sync

**Context.** Scroll sync maps source lines to `.code-line` elements and caches the list per document version. Hidden elements have empty boxes.

**Decision.** `renderView` removes `code-line` from hidden elements and their children, and puts it back when they show.

**Consequences.** After an edit, the map skips folded content. Right after a fold, without an edit, the cached map may still hold the old elements until the next update. The spike measures how it feels.

## 008. Toolchain

**Decision and reasons.**

- **pnpm 12.** Build scripts of dependencies are blocked by default, so `pnpm-workspace.yaml` allows `esbuild` and `@vscode/vsce-sign` (`allowBuilds`).
- **esbuild, two bundles.** `dist/extension.js` (CommonJS for Node, `vscode` external) and `dist/preview.js` (an IIFE for the browser). One small file each, so the extension loads fast and the `.vsix` stays around 16 KB.
- **TypeScript 6.0.** typescript-eslint supports TypeScript below 6.1, so TypeScript 7 waits.
- **Two tsconfig projects.** `tsconfig.node.json` (Node and `vscode` types, no DOM) and `tsconfig.preview.json` (DOM, no `vscode`), so the compiler catches code in the wrong runtime.
- **`engines.vscode ^1.90.0`** with `@types/vscode 1.90.0`. vsce rejects `@types/vscode` newer than `engines`. CI runs the integration tests on 1.90.0 and on stable.
- **`@types/node` 22.** Vitest 5 requires it as a peer. VS Code 1.90 runs Node 20, and the extension only uses `node:crypto` `randomUUID`, which both have.
- **Vitest projects `node` and `preview`** (jsdom), mirroring the two runtimes. Integration tests use Mocha through `@vscode/test-cli`, which is the official runner.
- **`activationEvents: []`.** vsce requires the field when `main` is set and nothing else activates the extension. The commands and the markdown-it plugin activate it on demand.

## 009. No telemetry

**Decision.** No telemetry and no network requests.

**Consequences.** Feedback comes from issues and reviews. The README says so, which helps trust.

## Spike results (T02)

Fill in after T02. Cursor: version, VS Code: version.

| #   | Check                                                                                          | Cursor | VS Code | Decision |
| --- | ---------------------------------------------------------------------------------------------- | ------ | ------- | -------- |
| 1   | The preview script loads; `vscode.markdown.updateContent` fires on every edit                  |        |         |          |
| 2   | Morphdom removes our attributes and elements on update                                         |        |         |          |
| 3   | `localStorage` survives a tab switch and a restart                                             |        |         |          |
| 4   | Marker + `markdown.preview.refresh` reach the script; a new webview doesn't replay the command |        |         |          |
| 5   | `Cmd+K Cmd+0` and `Cmd+K Cmd+J` work with the preview focused                                  |        |         |          |
| 6   | Scroll sync with hidden blocks, with and without removing `code-line`                          |        |         |          |
| 7   | How to open `.md` files in the classic preview by default                                      |        |         |          |
