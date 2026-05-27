import { LocalPdfProvider } from "./local-pdf.provider";
import type { InvoiceProvider } from "../types/invoice-provider";

/**
 * Sélectionne l'implémentation `InvoiceProvider` à utiliser selon la variable
 * d'environnement `INVOICE_PROVIDER`. Singleton : la même instance est
 * retournée pour toute la durée de vie du process.
 *
 * Valeurs supportées (à étendre quand une PDP/PA est signée) :
 *  - `local` (défaut) — pas de plateforme externe, comportement B2C actuel
 *  - `chorus-pro`     — Chorus Pro pour B2G (Phase 5)
 *  - `pdp-xxx`        — PDP commerciale (Phase 3-4)
 *
 * Pour les tests, importer directement `LocalPdfProvider` ou injecter un mock.
 */

let cached: InvoiceProvider | null = null;

export function getInvoiceProvider(): InvoiceProvider {
	if (cached) return cached;

	const providerId = process.env.INVOICE_PROVIDER ?? "local";

	switch (providerId) {
		case "local":
			cached = new LocalPdfProvider();
			return cached;

		// Implémentations futures — décommenter quand le contrat PDP est signé.
		// case "chorus-pro":
		// 	cached = new ChorusProProvider();
		// 	return cached;
		// case "pdp-xxx":
		// 	cached = new PdpXxxProvider();
		// 	return cached;

		default:
			throw new Error(
				`Unknown INVOICE_PROVIDER value: "${providerId}". ` + `Supported: "local" (default).`,
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
