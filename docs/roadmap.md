# Roadmap

Version 0.1.0 is the first public release.

Statuses: `todo`, `doing`, `done`.

| ID  | Task                   | Delivers                                                                                           | Status |
| --- | ---------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| T01 | Scaffold and first run | Tooling, manifest, two bundles, F5 into the Extension Development Host, a preview script that logs | done   |
| T02 | Spike                  | The six assumptions checked in Cursor and VS Code, results in `decisions.md`                       | done   |
| T03 | Section model          | `sections.ts`: outline, keys, visibility, with tests                                               | done   |
| T04 | State and storage      | `store.ts` reducer and `storage.ts`, with tests                                                    | done   |
| T05 | DOM layer              | `dom.ts`, `app.ts`, the protocol; folding works in the preview, unstyled                           | done   |
| T06 | Caret and theme        | `preview.css`: Obsidian-style caret, theme colors, focus, high contrast, reduced motion            | done   |
| T07 | markdown-it marker     | `marker.ts`; the state is saved per file                                                           | done   |
| T08 | Commands               | Collapse All / Expand All: title bar, Command Palette, key bindings; integration tests             | done   |
| T09 | Quality and CI         | GitHub repository, CI on every push (VS Code 1.90 and stable), Dependabot                          | doing  |
| T10 | Package and polish     | Icon, README with a demo GIF, CHANGELOG, `.vscodeignore`, a `.vsix` you use every day              | doing  |
| T11 | Publish                | VS Code Marketplace and Open VSX, release workflow on tags                                         | done   |
| T12 | Launch                 | Repository for contributors, posts, feedback, plan for 0.2                                         | doing  |

What's left is done by hand:

- **T09:** create the GitHub repository, push, set up the `main` ruleset. The workflows are in `.github/`.
- **T10:** a demo GIF for the README, a few days of daily use of the `.vsix`.
- **T12:** Discussions, topics, social preview, the first release from a tag, posts.

## Later

- Fold to level N (`Cmd+K Cmd+2` and so on, like the editor).
- A setting for the default state of new files (all open, or fold to a level).
- A setting to hide the "…" badge.
- Sync with folding in the editor.
- A web build for vscode.dev and github.dev.
