import * as Sentry from "@sentry/nextjs";
import { logger } from "@/shared/lib/logger";
import { LocalPdfProvider } from "./local-pdf.provider";
import { MockProvider } from "./mock.provider";
import type { InvoiceProvider } from "../types/invoice-provider";

/**
 * Sélectionne l'implémentation `InvoiceProvider` à utiliser selon la variable
 * d'environnement `INVOICE_PROVIDER`. Singleton : la même instance est
 * retournée pour toute la durée de vie du process.
 *
 * Valeurs supportées (à étendre quand une PDP/PA est signée) :
 *  - `local` (défaut) — pas de plateforme externe, comportement B2C actuel
 *  - `mock`           — provider in-memory pour staging / CI E2E
 *  - `chorus-pro`     — Chorus Pro pour B2G (Phase 5, non implémenté)
 *  - `pdp-xxx`        — PDP commerciale (Phase 3-4, non implémenté)
 *
 * Pour les tests, importer directement `LocalPdfProvider`/`MockProvider` ou
 * injecter via `setInvoiceProviderForTests()`.
 */

let cached: InvoiceProvider | null = null;

export function getInvoiceProvider(): InvoiceProvider {
	if (cached) return cached;

	const providerId = process.env.INVOICE_PROVIDER ?? "local";

	switch (providerId) {
		case "local":
			cached = new LocalPdfProvider();
			return cached;

		case "mock":
			if (process.env.NODE_ENV === "production") {
				const warning =
					'INVOICE_PROVIDER="mock" activated in production — MockProvider does not transmit ' +
					"to any real PDP. Only use for controlled canary tests; switch back to a real provider " +
					"before serving real invoices.";
				logger.warn(warning, { providerId, nodeEnv: process.env.NODE_ENV });
				Sentry.captureMessage(warning, { level: "warning" });
			}
			cached = new MockProvider();
			return cached;

		// Implémentations futures — décommenter quand le contrat PDP est signé.
		// case "chorus-pro":
		// 	cached = new ChorusProProvider();
		// 	return cached;
		// case "pdp-xxx":
		// 	cached = new PdpXxxProvider();
		// 	return cached;

		case "chorus-pro":
		case "pdp-xxx":
			throw new Error(
				`INVOICE_PROVIDER "${providerId}" is reserved but not implemented yet. ` +
					`Implement the class and add the case here before activating.`,
			);

		default:
			throw new Error(
				`Unknown INVOICE_PROVIDER value: "${providerId}". ` +
					`Supported: "local" (default), "mock", "chorus-pro", "pdp-xxx".`,
			);
	}
}

/**
 * Reset le singleton — utile uniquement en tests qui changent
 * `process.env.INVOICE_PROVIDER` dynamiquement.
 */
export function resetInvoiceProviderForTests(): void {
	cached = null;
}
