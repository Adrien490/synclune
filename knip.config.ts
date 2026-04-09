import type { KnipConfig } from "knip";

const config: KnipConfig = {
	entry: ["app/sw.ts", "emails/*.tsx"],

	ignore: ["app/generated/**", "e2e/**", "scripts/**"],

	ignoreDependencies: [
		"@react-email/preview-server",
		"@better-auth/cli",
		"pino-pretty",
		"@types/color",
	],

	ignoreBinaries: ["license-checker-rsync-3"],

	rules: {
		duplicates: "off",
		binaries: "off",
		unlisted: "off",
	},
};

export default config;
