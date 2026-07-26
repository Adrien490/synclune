import type { KnipConfig } from "knip";

const config: KnipConfig = {
	entry: ["emails/*.tsx"],

	ignore: ["e2e/**", "scripts/**"],

	ignoreDependencies: ["@better-auth/cli", "pino-pretty", "@types/color"],

	rules: {
		duplicates: "off",
		binaries: "off",
		unlisted: "off",
	},
};

export default config;
