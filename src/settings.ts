import { App, PluginSettingTab, Setting } from "obsidian";
import type { OutputFormat } from "./format";
import type CopyAsContextPlugin from "./main";

export type PathStyle = "relative" | "absolute";

export interface CopyAsContextSettings {
	format: OutputFormat;
	pathStyle: PathStyle;
	includeHeadings: boolean;
	/** Folder tree: patterns to leave out, one per entry. */
	treeExclude: string[];
}

export const DEFAULT_SETTINGS: CopyAsContextSettings = {
	format: "markdown",
	pathStyle: "relative",
	includeHeadings: true,
	treeExclude: ["node_modules"],
};

export class CopyAsContextSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: CopyAsContextPlugin,
	) {
		super(app, plugin);
	}

	override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Output format")
			.setDesc("Markdown wraps the text in a code fence; XML wraps it in a <file> tag; plain text keeps only a header line.")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ markdown: "Markdown", xml: "XML", plain: "Plain text" })
					.setValue(this.plugin.settings.format)
					.onChange(async (value) => {
						this.plugin.settings.format = value as OutputFormat;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Path")
			.setDesc("Relative paths match a terminal or agent started at the vault root; absolute paths work from anywhere.")
			.addDropdown((dropdown) =>
				dropdown
					.addOptions({ relative: "Relative to vault", absolute: "Absolute" })
					.setValue(this.plugin.settings.pathStyle)
					.onChange(async (value) => {
						this.plugin.settings.pathStyle = value as PathStyle;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Include heading path")
			.setDesc("Add the headings the selection sits under, e.g. “Intro > Hook”.")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.includeHeadings).onChange(async (value) => {
					this.plugin.settings.includeHeadings = value;
					await this.plugin.saveSettings();
				}),
			);

		new Setting(containerEl).setName("Folder tree").setHeading();

		new Setting(containerEl)
			.setName("Exclude")
			.setDesc(
				"One pattern per line. Without a slash it matches a name anywhere (node_modules, *.log); with a slash it matches the path from the vault root (Archive/, projects/old).",
			)
			.addTextArea((text) => {
				text.inputEl.rows = 5;
				text.setValue(this.plugin.settings.treeExclude.join("\n")).onChange(async (value) => {
					this.plugin.settings.treeExclude = value.split("\n");
					await this.plugin.saveSettings();
				});
			});
	}
}
