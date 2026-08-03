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

	it("discovers all 3 cron routes", () => {
		// Tripwire : a different count means a cron was added/removed without
		// updating vercel.json or the docs. Adjust this number deliberately.
		// 2026-05-30 : 10 → 11, réintégration de `reconcile-invoices` (DLQ facture
		// Art. 286/289-I, obligation LIVE indépendante du go-live e-reporting).
		// 2026-06 (audit right-sizing) : 11 → 8, retrait des 3 crons d'alerte
		// (dispute-deadlines, overbilled-orders, stuck-orders) → widget dashboard "à traiter".
		// 2026-06-24 (audit paiement) : 8 → 10, réactivation de `cleanup-pending-orders`
		// (tripwire SPOF AM-5, MON-02) + `alert-dispute-deadlines` (rappel PUSH chargeback,
		// MON-01). `overbilled`/`stuck-orders` restent en dashboard PULL.
		// 2026-07-01 (audit catalogue) : 10 → 11, réactivation de `cleanup-orphan-media`
		// (P1-B : les mutations médias admin comptent sur ce filet — sans lui, chaque
		// remplacement d'image orpheline le fichier UploadThing définitivement).
		// 2026-07-30 (simplification V1) : 11 → 10, retrait d'`alert-dispute-deadlines`
		// avec le modèle `Dispute` — la deadline est portée par l'alerte e-mail émise à
		// l'ouverture du litige, et le cycle de vie se suit dans le Dashboard Stripe.
		// 2026-08-03 (SIMPLIFICATION.md Lot 1) : 9 → 3, seul le noyau légal/RGPD reste
		// automatique (reconcile-invoices, cleanup-pending-orders, hard-delete-retention) ;
		// les 5 passes de rattrapage sont devenues des boutons sur
		// /admin/configuration/maintenance et `reopen-store` est supprimé (la lecture
		// traite déjà un reopensAt échu comme boutique ouverte).
		expect(routeFiles).toHaveLength(3);
	});

	it.each(routeFiles)("%s exports maxDuration >= 60", (routePath) => {
		const source = readFileSync(routePath, "utf-8");
		const match = /export\s+const\s+maxDuration\s*=\s*(\d+)/.exec(source);

		expect(match, `${routePath} must export maxDuration`).not.toBeNull();
		const value = Number(match![1]);
		expect(value).toBeGreaterThanOrEqual(MIN_MAX_DURATION);
	});
});
