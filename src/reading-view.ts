import { MarkdownPostProcessorContext, MarkdownView, Plugin } from "obsidian";

const BLOCK_ATTR = "data-copy-as-context-block";

/** Does `range` select any visible text inside `el`? */
function selectsTextIn(range: Range, el: HTMLElement): boolean {
	const part = el.ownerDocument.createRange();
	part.selectNodeContents(el);
	if (range.compareBoundaryPoints(Range.START_TO_START, part) > 0) part.setStart(range.startContainer, range.startOffset);
	if (range.compareBoundaryPoints(Range.END_TO_END, part) < 0) part.setEnd(range.endContainer, range.endOffset);
	return !part.collapsed && part.toString().trim() !== "";
}

/**
 * Maps a reading-view selection back to source lines.
 *
 * Obsidian renders reading view block by block (paragraph, list, heading, ...) and tells
 * post processors which source lines each block came from. We remember each block's
 * context and ask it for the current line range at copy time, as the API recommends.
 */
export class ReadingViewLines {
	private readonly contexts = new WeakMap<HTMLElement, MarkdownPostProcessorContext>();

	constructor(private readonly plugin: Plugin) {
		plugin.registerMarkdownPostProcessor((el, ctx) => {
			this.contexts.set(el, ctx);
			el.setAttribute(BLOCK_ATTR, "");
		});
	}

	/** Re-render open reading views so blocks rendered before the plugin loaded get tracked too. */
	rerenderOpenViews(): void {
		this.plugin.app.workspace.iterateAllLeaves((leaf) => {
			if (leaf.view instanceof MarkdownView && leaf.view.getMode() === "preview") {
				leaf.view.previewMode.rerender(true);
			}
		});
	}

	/** 0-based inclusive line range of the blocks the selection touches, or null if unknown. */
	selectedLines(view: MarkdownView, range: Range): { start: number; end: number } | null {
		const path = view.file?.path;
		let start = Number.POSITIVE_INFINITY;
		let end = Number.NEGATIVE_INFINITY;
		view.previewMode.containerEl.querySelectorAll<HTMLElement>(`[${BLOCK_ATTR}]`).forEach((el) => {
			const ctx = this.contexts.get(el);
			// Skip blocks of embedded notes: their lines belong to another file.
			if (!ctx || ctx.sourcePath !== path || !selectsTextIn(range, el)) return;
			const info = ctx.getSectionInfo(el);
			if (!info) return;
			start = Math.min(start, info.lineStart);
			end = Math.max(end, info.lineEnd);
		});
		return start === Number.POSITIVE_INFINITY ? null : { start, end };
	}
}
