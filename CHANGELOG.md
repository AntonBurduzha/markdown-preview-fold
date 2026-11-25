# Changelog

All notable changes to this extension are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/AntonBurduzha/markdown-preview-fold/compare/v0.1.0...HEAD)

## [0.1.0](https://github.com/AntonBurduzha/markdown-preview-fold/releases/tag/v0.1.0) - 2026-11-25

### Added

- A caret next to each heading with content in the built-in Markdown preview. Click it to fold or unfold the section, Option+click or Alt+click to include all subsections.
- Folded subsections keep their state when the parent opens.
- The state survives edits, tab switches and restarts, separately for each file.
- Collapse All and Expand All in the preview's title bar, in the Command Palette, and on `Cmd+K Cmd+0` / `Cmd+K Cmd+J` (`Ctrl+K Ctrl+0` / `Ctrl+K Ctrl+J`).
- Links into folded sections open the sections above the target.
- Theme colors, high contrast support, keyboard focus and reduced motion.
