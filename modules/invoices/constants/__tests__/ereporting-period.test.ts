/**
 * EINV-EREPORT-006 — `computeEReportingPeriod` : bornes [periodFrom, periodTo)
 * alignées sur `EREPORTING_PERIOD_LENGTH`, CONTIGUËS d'une période à l'autre
 * (ni trou ni recouvrement, compatible avec l'exclusion constraint Postgres).
 *
 * `EREPORTING_PERIOD_LENGTH` est figé à l'import depuis l'env → on recharge le
 * module par `vi.resetModules()` + `vi.stubEnv` pour exercer chaque longueur.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

async function loadWithLength(length: string) {
	vi.resetModules();
	vi.stubEnv("EREPORTING_PERIOD_LENGTH", length);
	return import("../ereporting-period");
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.resetModules();
});

describe("computeEReportingPeriod — DAILY (défaut)", () => {
	it("aligne sur le jour UTC, periodTo = lendemain minuit", async () => {
		const { computeEReportingPeriod } = await loadWithLength("DAILY");
		const { periodFrom, periodTo } = computeEReportingPeriod(new Date("2026-05-29T13:37:00.000Z"));
		expect(periodFrom.toISOString()).toBe("2026-05-29T00:00:00.000Z");
		expect(periodTo.toISOString()).toBe("2026-05-30T00:00:00.000Z");
	});

	it("valeur inconnue → fallback DAILY", async () => {
		const { EREPORTING_PERIOD_LENGTH } = await loadWithLength("WEEKLY");
		expect(EREPORTING_PERIOD_LENGTH).toBe("DAILY");
	});
});

describe("computeEReportingPeriod — MONTHLY", () => {
	it("aligne sur le 1er du mois → 1er du mois suivant", async () => {
		const { computeEReportingPeriod } = await loadWithLength("MONTHLY");
		const { periodFrom, periodTo } = computeEReportingPeriod(new Date("2026-05-15T10:00:00.000Z"));
		expect(periodFrom.toISOString()).toBe("2026-05-01T00:00:00.000Z");
		expect(periodTo.toISOString()).toBe("2026-06-01T00:00:00.000Z");
	});

	it("décembre → janvier de l'année suivante", async () => {
		const { computeEReportingPeriod } = await loadWithLength("MONTHLY");
		const { periodTo } = computeEReportingPeriod(new Date("2026-12-31T23:59:00.000Z"));
		expect(periodTo.toISOString()).toBe("2027-01-01T00:00:00.000Z");
	});
});

describe("computeEReportingPeriod — BIMONTHLY", () => {
	it("Jan/Fév forment un bimestre [Jan1, Mar1)", async () => {
		const { computeEReportingPeriod } = await loadWithLength("BIMONTHLY");
		const jan = computeEReportingPeriod(new Date("2026-01-20T10:00:00.000Z"));
		const feb = computeEReportingPeriod(new Date("2026-02-10T10:00:00.000Z"));
		expect(jan.periodFrom.toISOString()).toBe("2026-01-01T00:00:00.000Z");
		expect(jan.periodTo.toISOString()).toBe("2026-03-01T00:00:00.000Z");
		// Fév tombe dans le MÊME bimestre que Jan.
		expect(feb.periodFrom.toISOString()).toBe(jan.periodFrom.toISOString());
	});

	it("Nov/Déc → [Nov1, Jan1 année+1)", async () => {
		const { computeEReportingPeriod } = await loadWithLength("BIMONTHLY");
		const { periodFrom, periodTo } = computeEReportingPeriod(new Date("2026-12-15T10:00:00.000Z"));
		expect(periodFrom.toISOString()).toBe("2026-11-01T00:00:00.000Z");
		expect(periodTo.toISOString()).toBe("2027-01-01T00:00:00.000Z");
	});

	it("périodes consécutives contiguës : periodTo[n] === periodFrom[n+1] (ni trou ni overlap)", async () => {
		const { computeEReportingPeriod } = await loadWithLength("BIMONTHLY");
		const b1 = computeEReportingPeriod(new Date("2026-03-10T00:00:00.000Z")); // Mar/Avr
		const b2 = computeEReportingPeriod(new Date("2026-05-10T00:00:00.000Z")); // Mai/Juin
		expect(b1.periodTo.toISOString()).toBe(b2.periodFrom.toISOString());
	});
});
