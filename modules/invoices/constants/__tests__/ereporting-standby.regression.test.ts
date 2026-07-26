import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @regression ereporting-standby
 *
 * Audit right-sizing (§4.6) — l'e-reporting DGFiP B2C est livré mais doit rester
 * en STANDBY tant que (a) l'obligation n'est pas en vigueur (1ᵉʳ sept. 2027) et
 * (b) aucune Plateforme Agréée n'est branchée. Ce test verrouille l'invariant
 * « jamais transmis par accident » sur deux fronts :
 *   1. le feature flag `enable_ereporting` est OFF par défaut (env non défini) ;
 *   2. AUCUN cron de transmission/agrégation e-reporting n'est planifié dans
 *      vercel.json (les services build-/transmit-ereporting-batch existent mais
 *      restent sans route cron jusqu'au go-live).
 *
 * Au go-live (cf. docs/RUNBOOK.md § e-reporting), ce test sera ajusté
 * délibérément en même temps que l'activation du flag + le branchement de la PA.
 */
describe("e-reporting standby (audit right-sizing §4.6)", () => {
	it("garde enable_ereporting OFF par défaut (env non défini)", async () => {
		expect(process.env.INVOICE_ENABLE_EREPORTING).toBeFalsy();
		const { INVOICE_FEATURE_FLAGS } = await import("../feature-flags");
		expect(INVOICE_FEATURE_FLAGS.enable_ereporting).toBe(false);
	});

	it("n'a aucun cron e-reporting planifié dans vercel.json", () => {
		const vercelConfig = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf-8")) as {
			crons?: Array<{ path: string }>;
		};

		const ereportingCrons = (vercelConfig.crons ?? []).filter((c) => c.path.includes("ereporting"));

		expect(ereportingCrons).toEqual([]);
	});
});
