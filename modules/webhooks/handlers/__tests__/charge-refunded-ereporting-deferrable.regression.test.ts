/**
 * @regression charge-refunded-ereporting-deferrable-2026-05-30
 *
 * Verrouille le fix F1 (audit e-reporting 2026-05-30) : le handler
 * `charge.refunded` DOIT enregistrer la transaction e-reporting REFUND via la
 * variante `recordRefundEReportingDeferrable` (DLQ), JAMAIS via la variante
 * directe `recordRefundEReporting`.
 *
 * Pourquoi (rupture comptable si la garde saute) :
 *  - `recordRefundEReporting` est best-effort : sur erreur transitoire (timeout
 *    DB, build payload) elle retourne "error" SANS throw. Le handler ignore ce
 *    retour → le webhook est marqué COMPLETED → Stripe ne rejoue pas.
 *  - `reconcile-refunds` ne rattrape PAS ces refunds : il ne sélectionne que
 *    les refunds APPROVED + processedAt=null, or les refunds finalisés par CE
 *    webhook (Dashboard Stripe ou admin post-abort SAGA) ont processedAt posé
 *    et status COMPLETED.
 *  - Résultat sans le fix : la ligne DGFiP négative n'est jamais créée →
 *    l'agrégat B2C surévalue le CA net (sous-déclaration des remboursements,
 *    Art. 286 CGI).
 *  - La variante `deferrable` pose `Refund.ereportingRetryDeferred=true` sur
 *    "error", drainé par la Passe 6 de `reconcile-invoices`
 *    (`runRefundEReportingDeferredSweep` : Refund COMPLETED + flag=true).
 *
 * Test statique (scan source) volontaire : robuste face au refactor du handler
 * (pas de mock fragile de ses ~10 dépendances), et calqué sur le pattern de
 * `no-manual-ereporting-write.regression.test.ts`.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HANDLER_PATH = join(process.cwd(), "modules/webhooks/handlers/refund-handlers.ts");

function strippedSource(): string {
	const raw = readFileSync(HANDLER_PATH, "utf-8");
	// Retire les commentaires `/* */` et `//` pour ne matcher que le code réel
	// (les commentaires mentionnent légitimement `recordRefundEReporting`).
	return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

describe("@regression charge.refunded — e-reporting REFUND via deferrable (DLQ)", () => {
	it("importe recordRefundEReportingDeferrable depuis defer-ereporting-retry.service", () => {
		const src = strippedSource();
		expect(src).toMatch(
			/import\s*\{\s*recordRefundEReportingDeferrable\s*\}\s*from\s*["']@\/modules\/invoices\/services\/defer-ereporting-retry\.service["']/,
		);
	});

	it("appelle recordRefundEReportingDeferrable (variante DLQ) dans le code", () => {
		const src = strippedSource();
		expect(src).toMatch(/await\s+recordRefundEReportingDeferrable\s*\(/);
	});

	it("n'appelle JAMAIS la variante directe recordRefundEReporting (best-effort sans DLQ)", () => {
		const src = strippedSource();
		// La variante directe `recordRefundEReporting(` ne doit pas apparaître
		// comme appel. `recordRefundEReportingDeferrable(` est tolérée (préfixe).
		const directCalls = [...src.matchAll(/\brecordRefundEReporting\s*\(/g)];
		expect(directCalls).toEqual([]);
	});

	it("n'importe PAS recordRefundEReporting depuis record-ereporting.service (variante directe)", () => {
		const src = strippedSource();
		expect(src).not.toMatch(
			/import\s*\{[^}]*\brecordRefundEReporting\b[^}]*\}\s*from\s*["']@\/modules\/invoices\/services\/record-ereporting\.service["']/,
		);
	});
});
