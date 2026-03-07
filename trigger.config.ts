import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
	project: process.env.TRIGGER_PROJECT_ID ?? "synclune",
	maxDuration: 300,
	dirs: ["modules/jobs"],
	retries: {
		enabledInDev: false,
		default: {
			maxAttempts: 3,
			minTimeoutInMs: 1000,
			maxTimeoutInMs: 30000,
			factor: 2,
		},
	},
});
