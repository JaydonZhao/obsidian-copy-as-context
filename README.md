# Copy as Context

Select text in a note and copy it together with where it came from — the note path, line numbers and the headings it sits under — ready to paste into an AI chat or a terminal agent such as Claude Code or Codex. You can also copy a folder as a `├──` / `└──` tree.

## Copy a selection

Select some text, then use any of:

- **Right-click → Copy as context** (editing view)
- **Command palette → Copy as Context: Copy selection as context**
- A hotkey you assign in **Settings → Hotkeys** (the plugin sets none by default)

What lands on the clipboard (Markdown format):

````
File: projects/launch/script.md (lines 12-20, section: Intro > Hook)
```markdown
…the selected text…
```
````

- Line numbers start at 1 and match the file on disk, frontmatter included, so an agent can open the file at those lines.
- With multiple cursors, each selection becomes its own block.
- In **reading view**, the plugin finds the blocks (paragraphs, lists, headings…) your selection touches and copies their original Markdown with exact line numbers, instead of the rendered text with its formatting stripped. This also works when the same sentence appears more than once in the note.

## Copy a folder tree

Right-click a folder in the file explorer → **Copy folder tree**:

````
Folder: projects/launch
```text
launch/
├── footage/
│   ├── clip2.mp4
│   └── clip10.mp4
├── notes.md
└── script.md
```
````

Folders come first and end with `/`. Big folders such as `node_modules` can be left out with the **Exclude** setting.

## Settings

| Setting | Options | Default |
|---|---|---|
| Output format | Markdown (code fence), XML (`<file>` / `<tree>` tag), plain text (header line only) | Markdown |
| Path | Relative to the vault, or absolute | Relative |
| Include heading path | Add the headings the selection sits under | On |
| Folder tree → Exclude | One pattern per line. Without a slash it matches a name anywhere (`node_modules`, `*.log`); with a slash it matches the path from the vault root (`Archive/`, `projects/old`) | `node_modules` |

## Install

From Obsidian: **Settings → Community plugins → Browse**, search for “Copy as Context”.

Manually: download `main.js` and `manifest.json` from the [latest release](https://github.com/JaydonZhao/obsidian-copy-as-context/releases/latest) into `<vault>/.obsidian/plugins/copy-as-context/`, then enable the plugin under **Settings → Community plugins**.

## Development

```bash
npm install
npm test          # unit tests for formatting and tree logic
npm run build     # type-check and bundle main.js
npm run install-plugin -- /path/to/vault   # copy main.js and manifest.json into a vault
```

## License

[MIT](LICENSE)
