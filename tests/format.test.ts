import { describe, expect, it } from "vitest";
import { fenceFor, formatContext, headingTrail, selectionLineRange } from "../src/format";

describe("selectionLineRange", () => {
	it("converts 0-based positions to 1-based inclusive lines", () => {
		expect(selectionLineRange({ line: 11, ch: 2 }, { line: 19, ch: 5 })).toEqual({ start: 12, end: 20 });
	});

	it("drops the last line when the selection ends at its column 0", () => {
		expect(selectionLineRange({ line: 11, ch: 0 }, { line: 20, ch: 0 })).toEqual({ start: 12, end: 20 });
	});

	it("keeps a single-line selection on its own line", () => {
		expect(selectionLineRange({ line: 4, ch: 0 }, { line: 4, ch: 0 })).toEqual({ start: 5, end: 5 });
	});
});

describe("headingTrail", () => {
	const headings = [
		{ level: 1, heading: "Title", line: 0 },
		{ level: 2, heading: "Intro", line: 3 },
		{ level: 3, heading: "Hook", line: 6 },
		{ level: 2, heading: "Body", line: 12 },
	];

	it("returns the enclosing headings outermost first", () => {
		expect(headingTrail(headings, 8)).toEqual(["Title", "Intro", "Hook"]);
	});

	it("pops deeper headings when a sibling section starts", () => {
		expect(headingTrail(headings, 14)).toEqual(["Title", "Body"]);
	});

	it("is empty above the first heading", () => {
		expect(headingTrail([{ level: 2, heading: "A", line: 5 }], 2)).toEqual([]);
	});
});

describe("fenceFor", () => {
	it("uses three backticks for plain text", () => {
		expect(fenceFor("hello")).toBe("```");
	});

	it("outgrows code fences inside the text", () => {
		expect(fenceFor("a\n```js\nx\n```\n")).toBe("````");
	});
});

describe("formatContext", () => {
	const piece = { text: "第一行\n第二行", startLine: 12, endLine: 13, headings: ["开场", "钩子"] };

	it("formats markdown with path, lines, section and a fence", () => {
		expect(formatContext([piece], { path: "notes/a.md", language: "markdown", format: "markdown" })).toBe(
			"File: notes/a.md (lines 12-13, section: 开场 > 钩子)\n```markdown\n第一行\n第二行\n```",
		);
	});

	it("formats xml with escaped attributes", () => {
		const out = formatContext([{ ...piece, headings: ['Q&A "1"'] }], {
			path: "notes/a.md",
			language: "markdown",
			format: "xml",
		});
		expect(out).toBe('<file path="notes/a.md" lines="12-13" section="Q&amp;A &quot;1&quot;">\n第一行\n第二行\n</file>');
	});

	it("formats plain text with only a header line", () => {
		expect(
			formatContext([{ text: "x", startLine: 3, endLine: 3, headings: [] }], {
				path: "a.md",
				language: "markdown",
				format: "plain",
			}),
		).toBe("File: a.md (line 3)\n\nx");
	});

	it("omits line numbers when they are unknown", () => {
		expect(formatContext([{ text: "x", headings: [] }], { path: "a.md", language: "markdown", format: "markdown" })).toBe(
			"File: a.md\n```markdown\nx\n```",
		);
	});

	it("joins multiple selections with a blank line", () => {
		const out = formatContext(
			[
				{ text: "a", startLine: 1, endLine: 1, headings: [] },
				{ text: "b", startLine: 5, endLine: 5, headings: [] },
			],
			{ path: "a.md", language: "markdown", format: "plain" },
		);
		expect(out).toBe("File: a.md (line 1)\n\na\n\nFile: a.md (line 5)\n\nb");
	});
});
