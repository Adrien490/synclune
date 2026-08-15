import type { KnipConfig } from "knip";

const config: KnipConfig = {
	entry: ["emails/*.tsx"],

	ignore: ["e2e/**", "scripts/**"],

	// @prisma/client : jamais importé directement, mais le client GÉNÉRÉ
	// (app/generated/prisma, provider "prisma-client") résout ses types runtime
	// dessus — le retirer casse tsc (vérifié au lot 6).
	ignoreDependencies: ["pino-pretty", "@prisma/client"],

	rules: {
		duplicates: "off",
		binaries: "off",
		unlisted: "off",
	},
};

export default config;
