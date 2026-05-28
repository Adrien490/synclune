import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Compile-time-ish guard: every Vercel cron route MUST export a numeric
 * `maxDuration` >= 60 (the Pro plan ceiling we rely on). Without this, a new
 * cron defaults to 10s (Hobby) and silently times out on any non-trivial batch.
 *
 * Pattern matched: `export const maxDuration = <NN>` where NN is a base-10 int.
 * Uses a string-level grep so the test does not import the route handlers
 * (which would pull `next/headers`, Sentry, Prisma, etc. into the test bundle).
 */

const CRON_DIR = join(process.cwd(), "app/api/cron");
const MIN_MAX_DURATION = 60;

function listCronRoutes(): string[] {
	return readdirSync(CRON_DIR)
		.filter((name) => {
			const path = join(CRON_DIR, name);
			return statSync(path).isDirectory() && name !== "__tests__";
		})
		.map((name) => join(CRON_DIR, name, "route.ts"));
}

describe("cron routes maxDuration export", () => {
	const routeFiles = listCronRoutes();

	it("discovers all 23 cron routes", () => {
		// Tripwire : a different count means a cron was added/removed without
		// updating vercel.json or the docs. Adjust this number deliberately.
		expect(routeFiles).toHaveLength(23);
	});

	it.each(routeFiles)("%s exports maxDuration >= 60", (routePath) => {
		const source = readFileSync(routePath, "utf-8");
		const match = /export\s+const\s+maxDuration\s*=\s*(\d+)/.exec(source);

		expect(match, `${routePath} must export maxDuration`).not.toBeNull();
		const value = Number(match![1]);
		expect(value).toBeGreaterThanOrEqual(MIN_MAX_DURATION);
	});
});
