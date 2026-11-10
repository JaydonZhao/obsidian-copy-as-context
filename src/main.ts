import { Editor, FileSystemAdapter, MarkdownView, Notice, Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
import { ContextPiece, formatContext, formatTree, headingTrail, HeadingInfo, selectionLineRange } from "./format";
import { ReadingViewLines } from "./reading-view";
import { CopyAsContextSettings, CopyAsContextSettingTab, DEFAULT_SETTINGS } from "./settings";
import { countNodes, makeExcluder, renderTree, TreeNode } from "./tree";

export default class CopyAsContextPlugin extends Plugin {
	override settings: CopyAsContextSettings = { ...DEFAULT_SETTINGS };
	private readingView!: ReadingViewLines;

	override async onload(): Promise<void> {
		await this.loadSettings();
		this.readingView = new ReadingViewLines(this);
		this.app.workspace.onLayoutReady(() => this.readingView.rerenderOpenViews());

		// No default hotkey (community plugin guideline); users bind one in Settings → Hotkeys.
		this.addCommand({
			id: "copy-selection",
			name: "Copy selection as context",
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view?.file) return false;
				if (!checking) void this.copyFromView(view, view.file);
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, info) => {
				const file = info.file;
				if (!file || !editor.somethingSelected()) return;
				menu.addItem((item) =>
					item
						.setTitle("Copy as context")
						.setIcon("clipboard-copy")
						.onClick(() => void this.copyFromEditor(editor, file)),
				);
			}),
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {
				if (!(file instanceof TFolder)) return;
				menu.addItem((item) =>
					item
						.setTitle("Copy folder tree")
						.setIcon("folder-tree")
						.onClick(() => void this.copyFolderTree(file)),
				);
			}),
		);

		this.addSettingTab(new CopyAsContextSettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS, ...((await this.loadData()) as Partial<CopyAsContextSettings> | null) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async copyFromView(view: MarkdownView, file: TFile): Promise<void> {
		if (view.getMode() === "source") {
			await this.copyFromEditor(view.editor, file);
			return;
		}
		await this.copyFromReadingView(view, file);
	}

	private async copyFromEditor(editor: Editor, file: TFile): Promise<void> {
		const headings = this.settings.includeHeadings ? this.headingsOf(file) : [];
		const pieces: ContextPiece[] = editor
			.listSelections()
			.map((sel) => {
				const anchorFirst =
					sel.anchor.line < sel.head.line || (sel.anchor.line === sel.head.line && sel.anchor.ch <= sel.head.ch);
				const from = anchorFirst ? sel.anchor : sel.head;
				const to = anchorFirst ? sel.head : sel.anchor;
				return { from, to };
			})
			.filter(({ from, to }) => from.line !== to.line || from.ch !== to.ch)
			.sort((a, b) => a.from.line - b.from.line || a.from.ch - b.from.ch)
			.map(({ from, to }) => {
				const { start, end } = selectionLineRange(from, to);
				const text = editor.getRange(from, to);
				return {
					// Dragging over whole lines ends at column 0 of the next line; drop that trailing newline.
					text: to.ch === 0 && to.line > from.line ? text.replace(/\r?\n$/, "") : text,
					startLine: start,
					endLine: end,
					headings: headingTrail(headings, from.line),
				};
			});

		if (pieces.length === 0) {
			new Notice("Select some text first.");
			return;
		}
		await this.writeSelection(file, pieces);
	}

	/**
	 * Reading view: copy the source Markdown of the blocks the selection touches, with their
	 * line range. Falls back to the rendered text without line numbers if the blocks are unknown.
	 */
	private async copyFromReadingView(view: MarkdownView, file: TFile): Promise<void> {
		const selection = view.containerEl.win.getSelection();
		const range = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
		if (!range || !selection?.toString().trim() || !view.previewMode.containerEl.contains(range.commonAncestorContainer)) {
			new Notice("Select some text first.");
			return;
		}

		const lines = this.readingView.selectedLines(view, range);
		if (!lines) {
			await this.writeSelection(file, [{ text: selection.toString(), headings: [] }]);
			return;
		}
		const source = view.getViewData().split("\n").slice(lines.start, lines.end + 1).join("\n");
		const headings = this.settings.includeHeadings ? headingTrail(this.headingsOf(file), lines.start) : [];
		await this.writeSelection(file, [{ text: source, startLine: lines.start + 1, endLine: lines.end + 1, headings }]);
	}

	private async copyFolderTree(folder: TFolder): Promise<void> {
		const excluded = makeExcluder(this.settings.treeExclude);
		const toNode = (f: TFolder): TreeNode => ({
			name: f.isRoot() ? this.app.vault.getName() : f.name,
			children: f.children
				.filter((child) => !excluded(child.name, child.path))
				.map((child) => (child instanceof TFolder ? toNode(child) : { name: child.name })),
		});
		const root = toNode(folder);
		await navigator.clipboard.writeText(formatTree(renderTree(root), this.pathOf(folder), this.settings.format));

		const { folders, files } = countNodes(root);
		new Notice(`Copied folder tree: ${folders} folders, ${files} files`);
	}

	private headingsOf(file: TFile): HeadingInfo[] {
		return (this.app.metadataCache.getFileCache(file)?.headings ?? []).map((h) => ({
			level: h.level,
			heading: h.heading,
			line: h.position.start.line,
		}));
	}

	private pathOf(file: TAbstractFile): string {
		const adapter = this.app.vault.adapter;
		const isRoot = file instanceof TFolder && file.isRoot();
		if (this.settings.pathStyle === "absolute" && adapter instanceof FileSystemAdapter) {
			return isRoot ? adapter.getBasePath() : adapter.getFullPath(file.path);
		}
		return isRoot ? "." : file.path;
	}

	private async writeSelection(file: TFile, pieces: ContextPiece[]): Promise<void> {
		const output = formatContext(pieces, {
			path: this.pathOf(file),
			language: file.extension === "md" ? "markdown" : file.extension,
			format: this.settings.format,
		});
		await navigator.clipboard.writeText(output);

		const first = pieces[0];
		const where =
			pieces.length > 1
				? `${pieces.length} selections`
				: first.startLine === undefined
					? "selection"
					: first.startLine === first.endLine
						? `line ${first.startLine}`
						: `lines ${first.startLine}-${first.endLine}`;
		new Notice(`Copied as context: ${file.name}, ${where}`);
	}
}
