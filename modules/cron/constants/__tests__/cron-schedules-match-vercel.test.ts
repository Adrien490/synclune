import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CRON_SCHEDULES } from "../schedules";

/**
 * MON-03 — verrou de cohérence entre `vercel.json` (autorité d'exécution des crons)
 * et `CRON_SCHEDULES` (SSOT consommé par with-cron-guard pour le Sentry Cron
 * Monitoring). Toute dérive (cron ajouté/retiré/replanifié d'un seul côté) casse la
 * détection de run manqué — ce test l'attrape.
 */
describe("CRON_SCHEDULES ↔ vercel.json", () => {
	const vercel = JSON.parse(readFileSync(resolve(process.cwd(), "vercel.json"), "utf-8")) as {
		crons: Array<{ path: string; schedule: string }>;
	};

	const vercelMap = new Map(
		vercel.crons.map((c) => [c.path.replace(/^\/api\/cron\//, ""), c.schedule]),
	);

	it("référence exactement les mêmes jobs des deux côtés", () => {
		expect(new Set(Object.keys(CRON_SCHEDULES))).toEqual(new Set(vercelMap.keys()));
	});

	it("a le même crontab pour chaque job", () => {
		for (const [job, schedule] of vercelMap) {
			expect(CRON_SCHEDULES[job], `schedule mismatch for ${job}`).toBe(schedule);
		}
	});

	it("chaque cron de vercel.json a un handler de route", () => {
		for (const job of vercelMap.keys()) {
			const routePath = resolve(process.cwd(), `app/api/cron/${job}/route.ts`);
			expect(() => readFileSync(routePath, "utf-8"), `missing route for ${job}`).not.toThrow();
		}
	});
});
