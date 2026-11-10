// Copy the built plugin into one or more vaults:
//   npm run install-plugin -- /path/to/vault /path/to/another-vault
// Only copies files; enable the plugin in Obsidian afterwards.
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const { id } = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const vaults = process.argv.slice(2);

if (vaults.length === 0) {
	console.error("usage: npm run install-plugin -- <vault-path> [<vault-path> ...]");
	process.exit(1);
}
if (!existsSync(join(root, "main.js"))) {
	console.error("main.js not found; run `npm run build` first");
	process.exit(1);
}

for (const vault of vaults) {
	const vaultPath = resolve(vault.replace(/^~(?=$|\/)/, homedir()));
	if (!existsSync(join(vaultPath, ".obsidian"))) {
		console.error(`skip ${vaultPath}: no .obsidian folder, not a vault`);
		process.exitCode = 1;
		continue;
	}
	const target = join(vaultPath, ".obsidian", "plugins", id);
	mkdirSync(target, { recursive: true });
	for (const file of ["main.js", "manifest.json"]) copyFileSync(join(root, file), join(target, file));
	console.log(`installed to ${target}`);
}
