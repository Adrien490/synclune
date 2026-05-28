/**
 * Feature flags du module facturation électronique.
 *
 * Synclune est une micro-entreprise en franchise de TVA vendant en B2C. La
 * seule couche structurée à activer à terme est l'e-reporting B2C agrégé vers
 * la DGFiP (réforme 2026-2027). Le système reste 100% local (PDF archivé) tant
 * que `enable_ereporting` est OFF.
 *
 * Configuration via env vars (par défaut OFF) :
 *   - INVOICE_ENABLE_EREPORTING — active la collecte + transmission B2C
 *   - INVOICE_PROVIDER          — sélectionne la PA concrète (défaut "local")
 */

function parseBool(value: string | undefined): boolean {
	if (!value) return false;
	const normalized = value.toLowerCase();
	return normalized === "true" || normalized === "1" || normalized === "yes";
}

export const INVOICE_FEATURE_FLAGS = {
	/** Crée et transmet les batches e-reporting B2C (réforme 2026-2027). */
	enable_ereporting: parseBool(process.env.INVOICE_ENABLE_EREPORTING),
} as const;

export type InvoiceFeatureFlags = typeof INVOICE_FEATURE_FLAGS;
