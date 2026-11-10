import { describe, expect, it } from "vitest";
import { formatTree } from "../src/format";
import { countNodes, makeExcluder, renderTree, TreeNode } from "../src/tree";

const root: TreeNode = {
	name: "project",
	children: [
		{ name: "script.md" },
		{ name: "footage", children: [{ name: "clip10.mp4" }, { name: "clip2.mp4" }] },
		{ name: "references", children: [] },
		{ name: "notes.md" },
	],
};

describe("renderTree", () => {
	it("draws folders first, natural order, with box-drawing branches", () => {
		expect(renderTree(root)).toBe(
			[
				"project/",
				"├── footage/",
				"│   ├── clip2.mp4",
				"│   └── clip10.mp4",
				"├── references/",
				"├── notes.md",
				"└── script.md",
			].join("\n"),
		);
	});

	it("indents under a last folder with spaces", () => {
		const tree: TreeNode = { name: "a", children: [{ name: "b", children: [{ name: "c.md" }] }] };
		expect(renderTree(tree)).toBe("a/\n└── b/\n    └── c.md");
	});

	it("renders an empty folder as just its name", () => {
		expect(renderTree({ name: "empty", children: [] })).toBe("empty/");
	});
});

describe("countNodes", () => {
	it("counts folders and files below the root", () => {
		expect(countNodes(root)).toEqual({ folders: 2, files: 4 });
	});
});

describe("makeExcluder", () => {
	const excluded = makeExcluder(["node_modules", "*.log", "Archive/", "projects/app/out", "", "# comment"]);

	it("matches names anywhere when the pattern has no slash", () => {
		expect(excluded("node_modules", "projects/app/node_modules")).toBe(true);
		expect(excluded("render.log", "a/b/render.log")).toBe(true);
	});

	it("matches the path from the vault root when the pattern has a slash", () => {
		expect(excluded("Archive", "Archive")).toBe(true);
		expect(excluded("Archive", "notes/Archive")).toBe(false);
		expect(excluded("out", "projects/app/out")).toBe(true);
	});

	it("ignores blank lines and comments, and keeps everything else", () => {
		expect(excluded("script.md", "notes/script.md")).toBe(false);
		expect(excluded("# comment", "# comment")).toBe(false);
	});

	it("treats regex characters literally", () => {
		expect(makeExcluder(["a.b"])("axb", "axb")).toBe(false);
	});
});

describe("formatTree", () => {
	it("wraps the tree in a text fence for markdown", () => {
		expect(formatTree("a/\n└── b.md", "notes/a", "markdown")).toBe("Folder: notes/a\n```text\na/\n└── b.md\n```");
	});

	it("wraps the tree in a tag for xml", () => {
		expect(formatTree("a/", "x&y", "xml")).toBe('<tree path="x&amp;y">\na/\n</tree>');
	});
});
