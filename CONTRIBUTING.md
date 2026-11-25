# Contributing

Thanks for helping. Bugs and ideas go to [Issues](https://github.com/AntonBurduzha/markdown-preview-fold/issues/new/choose), questions to [Discussions](https://github.com/AntonBurduzha/markdown-preview-fold/discussions).

## Reporting a bug

The bug form asks for the editor and its version, the extension version, a small Markdown file that shows the problem, and the steps. Errors from the preview page help a lot: run **Developer: Open Webview Developer Tools**, pick `active-frame` in the context list above the console, and copy what's red.

## Getting started

You need Node 24 (see `.nvmrc`) and pnpm 12 (`corepack enable` picks the version from `package.json`).

```bash
pnpm install
pnpm check
```

Press F5 in VS Code or Cursor. It starts `pnpm watch` and opens an Extension Development Host with `test/fixtures` as the workspace. Open `sample.md` and run **Markdown: Open Preview to the Side**.

- After a change in `src/preview/` or `media/`, run **Developer: Reload Webviews** in the Development Host.
- After a change in `src/extension.ts`, `src/commands.ts`, `src/markdownIt/` or `package.json`, restart it (`Cmd+Shift+F5` / `Ctrl+Shift+F5`).
- Logs from the extension host appear in the Debug Console of the first window. Logs from the preview page appear in the Webview Developer Tools.

The code runs in two places: the extension host (Node) and the preview page (a browser). [docs/architecture.md](docs/architecture.md) explains how they talk to each other, and [docs/decisions.md](docs/decisions.md) why.

## Commands

| Command                 | What it does                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `pnpm build`            | Builds `dist/extension.js` and `dist/preview.js`                                    |
| `pnpm watch`            | The same, on every save                                                             |
| `pnpm typecheck`        | TypeScript for both runtimes                                                        |
| `pnpm lint`             | ESLint, including the rule that keeps `vscode` out of the preview                   |
| `pnpm format:check`     | Prettier                                                                            |
| `pnpm test`             | Unit and DOM tests (Vitest)                                                         |
| `pnpm check`            | All four checks above                                                               |
| `pnpm test:integration` | Mocha tests in a real VS Code; `VSCODE_TEST_VERSION=1.90.0` for the minimum version |
| `pnpm package`          | Builds the `.vsix`                                                                  |

## Pull requests

- One change per PR, with a [Conventional Commits](https://www.conventionalcommits.org/) title: `feat: …`, `fix: …`, `docs: …`.
- New behavior comes with a test. Pure logic goes in `src/preview/sections.ts` or `src/preview/store.ts` and is tested without the DOM.
- Add a line under "Unreleased" in `CHANGELOG.md` for anything a user would notice.
- CI must be green. It runs the checks, the integration tests on VS Code 1.90.0 and stable on Linux, macOS and Windows, and builds the `.vsix`.

## Releasing (maintainers)

1. Open a PR that bumps `version` in `package.json`, moves the "Unreleased" items in `CHANGELOG.md` under the new version with today's date, and updates the compare links at the bottom.
2. After the merge, tag `main`:

   ```bash
   git switch main && git pull
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

3. The release workflow checks that the tag matches `package.json`, runs all the checks again, builds one `.vsix`, and publishes that file to Open VSX (the `OVSX_PAT` secret) and GitHub Releases.
4. Download the `.vsix` from the GitHub Release (`gh release download vX.Y.Z --pattern '*.vsix'`) and upload it on the [Marketplace publisher page](https://marketplace.visualstudio.com/manage): **⋯ → Update**. See ADR 010 in `docs/decisions.md` for why this step is manual.
