/**
 * Seuil de franchise en base de TVA (article 293 B CGI) — SSOT.
 *
 * Seuils 2026 (inchangés ; le seuil unique 25 000 € de la LF 2025 et celui de
 * 37 500 € envisagé pour 2026 ont tous deux été abandonnés) :
 *
 *  - **85 000 €** : ventes de marchandises (seuil majoré 93 500 €)
 *    → cas par défaut Synclune (bijoux artisanaux = vente de biens).
 *  - 37 500 € : prestations de services (seuil majoré 41 250 €).
 *
 * ⚠️ Zone grise : le parcours `/personnalisation` (sur-mesure) peut requalifier
 * une partie de l'activité en prestation de services (seuil 37 500 €), ce qui
 * change AUSSI la catégorie e-reporting (`operationCategory` figée à GOODS).
 * C'est un arbitrage à valider avec l'expert-comptable — pas dans le code.
 * Ajuster via `VAT_FRANCHISE_THRESHOLD_EUR` si l'activité bascule.
 */
export const DEFAULT_VAT_FRANCHISE_THRESHOLD_EUR = 85_000;

/**
 * Mention légale obligatoire de la franchise en base de TVA (Art. 293 B CGI) —
 * SSOT du libellé. Doit figurer sur toute facture émise sous ce régime.
 *
 * Utilisée comme valeur par défaut de `VENDOR_VAT_EXEMPTION_TEXT`
 * (`getVendorLegalInfo`) ET comme fallback non vide dans `buildSellerInfo` :
 * tant que le régime figé est `FRANCHISE_BASE`, on garantit qu'une mention
 * exacte est imprimée même si l'env est vide/blanc — jamais de mention
 * manquante figée 10 ans dans le snapshot facture (Art. L102 B LPF).
 */
export const DEFAULT_FRANCHISE_VAT_MENTION = "TVA non applicable, art. 293 B du CGI";

/**
 * Seuil de franchise applicable, en cents (cohérence Prisma/Stripe).
 *
 * Lit `VAT_FRANCHISE_THRESHOLD_EUR` (euros) si défini et valide, sinon retombe
 * sur le défaut « ventes de biens » (85 000 €). SSOT unique consommée par le
 * bandeau dashboard (`get-vat-progress`) et la vue facturation
 * (`get-invoicing-overview`).
 */
export function getFranchiseThresholdCents(): number {
	const raw = process.env.VAT_FRANCHISE_THRESHOLD_EUR;
	const parsed = raw ? Number(raw) : DEFAULT_VAT_FRANCHISE_THRESHOLD_EUR;
	const safe = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_VAT_FRANCHISE_THRESHOLD_EUR;
	return Math.round(safe * 100);
}
