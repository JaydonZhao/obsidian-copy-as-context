// Pure helpers for the folder tree. No Obsidian imports.

export interface TreeNode {
	name: string;
	/** Present for folders (possibly empty), absent for files. */
	children?: TreeNode[];
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

/** Folders before files, then natural name order (2 before 10), like Obsidian's file explorer. */
export function compareNodes(a: TreeNode, b: TreeNode): number {
	const aFolder = a.children !== undefined;
	const bFolder = b.children !== undefined;
	if (aFolder !== bFolder) return aFolder ? -1 : 1;
	return collator.compare(a.name, b.name);
}

function label(node: TreeNode): string {
	return node.children !== undefined ? `${node.name}/` : node.name;
}

/** Render `root` as a `├──` / `└──` tree. Folder names end with `/`. */
export function renderTree(root: TreeNode): string {
	const lines = [label(root)];
	const walk = (node: TreeNode, prefix: string): void => {
		const children = [...(node.children ?? [])].sort(compareNodes);
		children.forEach((child, i) => {
			const last = i === children.length - 1;
			lines.push(`${prefix}${last ? "└── " : "├── "}${label(child)}`);
			if (child.children !== undefined) walk(child, prefix + (last ? "    " : "│   "));
		});
	};
	walk(root, "");
	return lines.join("\n");
}

/** Count folders and files below `root` (the root itself is not counted). */
export function countNodes(root: TreeNode): { folders: number; files: number } {
	let folders = 0;
	let files = 0;
	const walk = (node: TreeNode): void => {
		for (const child of node.children ?? []) {
			if (child.children !== undefined) {
				folders++;
				walk(child);
			} else {
				files++;
			}
		}
	};
	walk(root);
	return { folders, files };
}

/** `*` matches any run of characters except `/`, `?` matches one such character. */
export function globToRegExp(pattern: string): RegExp {
	const source = pattern
		.split("")
		.map((c) => (c === "*" ? "[^/]*" : c === "?" ? "[^/]" : c.replace(/[.+^${}()|[\]\\]/g, "\\$&")))
		.join("");
	return new RegExp(`^${source}$`);
}

/**
 * Build an exclusion test from user patterns, one per entry.
 * A pattern without `/` matches an entry's name anywhere (`node_modules`, `*.log`);
 * a pattern with `/` matches the vault path from the root (`Archive/`, `projects/app/out`).
 * Empty entries and entries starting with `#` are ignored.
 */
export function makeExcluder(patterns: string[]): (name: string, path: string) => boolean {
	const rules = patterns
		.map((p) => p.trim())
		.filter((p) => p !== "" && !p.startsWith("#"))
		.map((p) => {
			const trimmed = p.replace(/^\/+|\/+$/g, "");
			return { byPath: p.includes("/"), re: globToRegExp(trimmed) };
		});
	return (name, path) => rules.some((rule) => rule.re.test(rule.byPath ? path : name));
}
