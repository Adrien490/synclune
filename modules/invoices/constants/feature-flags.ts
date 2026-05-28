/**
 * Feature flags du module facturation électronique.
 *
 * Drivers d'activation progressive des couches non-B2C (Factur-X XML,
 * e-reporting DGFiP, transmission PDP). Le système actuel reste 100% local
 * tant que `enable_xml` et `enable_ereporting` sont OFF.
 *
 * Configuration via env vars (toutes optionnelles, par défaut OFF) :
 *   - INVOICE_ENABLE_XML        — active le rendu Factur-X / UBL / CII
 *   - INVOICE_ENABLE_EREPORTING — active la collecte + transmission B2C
 *   - INVOICE_VALIDATE_XML      — active la validation CEN EN 16931 post-render
 *   - INVOICE_PROVIDER          — sélectionne le provider concret
 *
 * Une fois la Phase 3 prête, on active progressivement en commençant par
 * un sous-ensemble d'orders (canary) via un flag plus granulaire.
 */

function parseBool(value: string | undefined): boolean {
	if (!value) return false;
	const normalized = value.toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
}

export const INVOICE_FEATURE_FLAGS = {
	/** Génère le XML Factur-X / UBL / CII en plus du PDF (Phase 3). */
	enable_xml: parseBool(process.env.INVOICE_ENABLE_XML),
	/** Crée et transmet les batches e-reporting B2C (Phase 3). */
	enable_ereporting: parseBool(process.env.INVOICE_ENABLE_EREPORTING),
	/**
	 * Active la validation CEN EN 16931 post-render (BR-CO-* + BR-FR-*).
	 * Mode fail-closed : une violation throw → orchestrateur marque
	 * `invoiceRetryDeferred=true` pour retry cron. Recommandé en staging
	 * avant activation prod afin de capturer les drifts buildInvoiceData
	 * vs renderer (cf. audit e-invoicing 2026-05-28).
	 */
	validate_xml: parseBool(process.env.INVOICE_VALIDATE_XML),
} as const;

export type InvoiceFeatureFlags = typeof INVOICE_FEATURE_FLAGS;
