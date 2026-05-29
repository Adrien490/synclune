/**
 * @regression checkout-return-timeout
 *
 * Garantit que la page /paiement/retour borne ses appels Stripe avec un
 * timeout explicite (`withStripeDeadline`) pour éviter de figer la navigation
 * post-paiement quand Stripe est indisponible/lent (timeout Vercel 10-30s).
 *
 * Si ce test casse : ne PAS retirer le Promise.race. Le SDK Stripe ne supporte
 * pas de deadline native sur paymentIntents.retrieve.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const returnPage = readFileSync(join(__dirname, "..", "retour", "page.tsx"), "utf8");

describe("checkout return Stripe timeout (regression)", () => {
	it("définit STRIPE_RETRIEVE_TIMEOUT_MS (constante, pas magic number)", () => {
		expect(returnPage).toMatch(/STRIPE_RETRIEVE_TIMEOUT_MS\s*=\s*5_?000/);
	});

	it("borne paymentIntents.retrieve via withStripeDeadline", () => {
		expect(returnPage).toMatch(
			/withStripeDeadline\(\s*stripe\.paymentIntents\.retrieve\(piId\),\s*STRIPE_RETRIEVE_TIMEOUT_MS/,
		);
	});

	it("utilise Promise.race + setTimeout (pas AbortSignal — SDK Stripe ne le supporte pas)", () => {
		expect(returnPage).toMatch(/Promise\.race/);
		expect(returnPage).toMatch(/setTimeout/);
	});
});
