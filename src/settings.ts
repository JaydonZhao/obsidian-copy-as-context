import { App, PluginSettingTab, Setting, SettingDefinitionItem } from "obsidian";
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

// Shared by the declarative definitions (Obsidian 1.13+) and the display() fallback.
const TEXT = {
	format: {
		name: "Output format",
		desc: "Markdown wraps the text in a code fence; XML wraps it in a <file> tag; plain text keeps only a header line.",
		options: { markdown: "Markdown", xml: "XML", plain: "Plain text" },
	},
	pathStyle: {
		name: "Path",
		desc: "Relative paths match a terminal or agent started at the vault root; absolute paths work from anywhere.",
		options: { relative: "Relative to vault", absolute: "Absolute" },
	},
	includeHeadings: {
		name: "Include heading path",
		desc: "Add the headings the selection sits under, e.g. “Intro > Hook”.",
	},
	treeHeading: "Folder tree",
	treeExclude: {
		name: "Exclude",
		desc: "One pattern per line. Without a slash it matches a name anywhere (node_modules, *.log); with a slash it matches the path from the vault root (Archive/, projects/old).",
	},
};

type SettingKey = keyof CopyAsContextSettings;

export class CopyAsContextSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: CopyAsContextPlugin,
	) {
		super(app, plugin);
	}

	/** Obsidian 1.13+: renders the tab and indexes these settings for the settings search. */
	override getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: TEXT.format.name,
				desc: TEXT.format.desc,
				control: { type: "dropdown", key: "format", options: TEXT.format.options, defaultValue: DEFAULT_SETTINGS.format },
			},
			{
				name: TEXT.pathStyle.name,
				desc: TEXT.pathStyle.desc,
				aliases: ["absolute path", "relative path"],
				control: {
					type: "dropdown",
					key: "pathStyle",
					options: TEXT.pathStyle.options,
					defaultValue: DEFAULT_SETTINGS.pathStyle,
				},
			},
			{
				name: TEXT.includeHeadings.name,
				desc: TEXT.includeHeadings.desc,
				aliases: ["section"],
				control: { type: "toggle", key: "includeHeadings", defaultValue: DEFAULT_SETTINGS.includeHeadings },
			},
			{
				type: "group",
				heading: TEXT.treeHeading,
				items: [
					{
						name: TEXT.treeExclude.name,
						desc: TEXT.treeExclude.desc,
						aliases: ["ignore", "folder tree"],
						control: { type: "textarea", key: "treeExclude", rows: 5 },
					},
				],
			},
		];
	}

	/** The exclude list is stored as an array but edited as one pattern per line. */
	override getControlValue(key: string): unknown {
		const value = this.plugin.settings[key as SettingKey];
		return key === "treeExclude" ? (value as string[]).join("\n") : value;
	}

	override async setControlValue(key: string, value: unknown): Promise<void> {
		const settings = this.plugin.settings as unknown as Record<string, unknown>;
		settings[key] = key === "treeExclude" ? String(value).split("\n") : value;
		await this.plugin.saveSettings();
	}

	/** Fallback for Obsidian before 1.13, which does not read getSettingDefinitions(). */
	override display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName(TEXT.format.name)
			.setDesc(TEXT.format.desc)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(TEXT.format.options)
					.setValue(this.plugin.settings.format)
					.onChange((value) => this.setControlValue("format", value)),
			);

		new Setting(containerEl)
			.setName(TEXT.pathStyle.name)
			.setDesc(TEXT.pathStyle.desc)
			.addDropdown((dropdown) =>
				dropdown
					.addOptions(TEXT.pathStyle.options)
					.setValue(this.plugin.settings.pathStyle)
					.onChange((value) => this.setControlValue("pathStyle", value)),
			);

		new Setting(containerEl)
			.setName(TEXT.includeHeadings.name)
			.setDesc(TEXT.includeHeadings.desc)
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeHeadings)
					.onChange((value) => this.setControlValue("includeHeadings", value)),
			);

		new Setting(containerEl).setName(TEXT.treeHeading).setHeading();

		new Setting(containerEl)
			.setName(TEXT.treeExclude.name)
			.setDesc(TEXT.treeExclude.desc)
			.addTextArea((text) => {
				text.inputEl.rows = 5;
				text
					.setValue(String(this.getControlValue("treeExclude")))
					.onChange((value) => this.setControlValue("treeExclude", value));
			});
	}
}
