import type { KnipConfig } from "knip";

const config: KnipConfig = {
	entry: ["emails/*.tsx"],

	ignore: ["e2e/**", "scripts/**"],

	ignoreDependencies: ["pino-pretty"],

	rules: {
		duplicates: "off",
		binaries: "off",
		unlisted: "off",
	},
};

export default config;
