// Pure helpers that turn a selection into context text. No Obsidian imports,
// so everything here can be unit-tested in plain Node.

export type OutputFormat = "markdown" | "xml" | "plain";

export interface ContextPiece {
	text: string;
	/** 1-based, inclusive. Absent when the source lines are unknown (reading view). */
	startLine?: number;
	endLine?: number;
	/** Heading trail from the top-level heading down to the one the piece sits under. */
	headings: string[];
}

export interface FormatOptions {
	path: string;
	/** Code-fence language tag, e.g. "markdown". */
	language: string;
	format: OutputFormat;
}

export interface Pos {
	line: number;
	ch: number;
}

export interface HeadingInfo {
	level: number;
	heading: string;
	/** 0-based line of the heading in the file. */
	line: number;
}

/**
 * Convert an editor selection (0-based positions) to a 1-based inclusive line range.
 * A selection that ends at column 0 of a later line (dragging over whole lines)
 * does not count that last line.
 */
export function selectionLineRange(from: Pos, to: Pos): { start: number; end: number } {
	const endLine = to.ch === 0 && to.line > from.line ? to.line - 1 : to.line;
	return { start: from.line + 1, end: endLine + 1 };
}

/** Headings enclosing `line0` (0-based), outermost first. */
export function headingTrail(headings: HeadingInfo[], line0: number): string[] {
	const stack: HeadingInfo[] = [];
	for (const h of [...headings].sort((a, b) => a.line - b.line)) {
		if (h.line > line0) break;
		while (stack.length > 0 && stack[stack.length - 1].level >= h.level) stack.pop();
		stack.push(h);
	}
	return stack.map((h) => h.heading);
}

/** A backtick fence longer than any backtick run inside `text`. */
export function fenceFor(text: string): string {
	const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
	return "`".repeat(Math.max(3, longest + 1));
}

function lineLabel(piece: ContextPiece): string | undefined {
	if (piece.startLine === undefined) return undefined;
	const end = piece.endLine ?? piece.startLine;
	return end === piece.startLine ? `line ${piece.startLine}` : `lines ${piece.startLine}-${end}`;
}

function headerLine(piece: ContextPiece, path: string): string {
	const details: string[] = [];
	const lines = lineLabel(piece);
	if (lines) details.push(lines);
	if (piece.headings.length > 0) details.push(`section: ${piece.headings.join(" > ")}`);
	return details.length > 0 ? `File: ${path} (${details.join(", ")})` : `File: ${path}`;
}

function escapeAttr(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function formatPiece(piece: ContextPiece, opts: FormatOptions): string {
	switch (opts.format) {
		case "xml": {
			const attrs = [`path="${escapeAttr(opts.path)}"`];
			if (piece.startLine !== undefined) {
				const end = piece.endLine ?? piece.startLine;
				attrs.push(`lines="${end === piece.startLine ? piece.startLine : `${piece.startLine}-${end}`}"`);
			}
			if (piece.headings.length > 0) attrs.push(`section="${escapeAttr(piece.headings.join(" > "))}"`);
			return `<file ${attrs.join(" ")}>\n${piece.text}\n</file>`;
		}
		case "plain":
			return `${headerLine(piece, opts.path)}\n\n${piece.text}`;
		case "markdown":
		default: {
			const fence = fenceFor(piece.text);
			return `${headerLine(piece, opts.path)}\n${fence}${opts.language}\n${piece.text}\n${fence}`;
		}
	}
}

/** Format one or more pieces (multiple cursors) from the same file. */
export function formatContext(pieces: ContextPiece[], opts: FormatOptions): string {
	return pieces.map((piece) => formatPiece(piece, opts)).join("\n\n");
}

/** Wrap a rendered folder tree in the chosen output format. */
export function formatTree(tree: string, path: string, format: OutputFormat): string {
	switch (format) {
		case "xml":
			return `<tree path="${escapeAttr(path)}">\n${tree}\n</tree>`;
		case "plain":
			return `Folder: ${path}\n\n${tree}`;
		case "markdown":
		default: {
			const fence = fenceFor(tree);
			return `Folder: ${path}\n${fence}text\n${tree}\n${fence}`;
		}
	}
}
