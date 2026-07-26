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
const DEFAULT_VAT_FRANCHISE_THRESHOLD_EUR = 85_000;

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

/**
 * Seuil UNIQUE UE de ventes à distance intra-communautaires B2C (biens + services
 * électroniques) — directive (UE) 2017/2455, transposée art. 259 D CGI.
 *
 * Au-delà de **10 000 €/an** de ventes à distance vers des consommateurs d'AUTRES
 * États membres (cumul tous pays UE confondus, hors France), la TVA du pays de
 * DESTINATION devient due et se déclare via le guichet unique **OSS**. En dessous,
 * les règles du pays de départ s'appliquent (pour Synclune : franchise art. 293 B,
 * TVA = 0). Synclune est très en dessous aujourd'hui, mais ce seuil n'a AUCUN
 * garde-fou applicatif (audit G1) → on l'affiche au dashboard pour anticiper.
 *
 * ⚠️ Indicateur de MONITORING uniquement : aucun calcul de TVA-destination/OSS
 * n'est implémenté (et ne doit pas l'être tant qu'on reste sous le seuil — ce
 * serait de la sur-ingénierie). Au franchissement : voir docs/RUNBOOK.md § OSS.
 */
const EU_OSS_DISTANCE_SALES_THRESHOLD_EUR = 10_000;
export const EU_OSS_DISTANCE_SALES_THRESHOLD_CENTS = EU_OSS_DISTANCE_SALES_THRESHOLD_EUR * 100;

/**
 * Codes pays EXCLUS du décompte « ventes à distance intra-UE » : la France (pays
 * de départ) et Monaco (assimilé territoire français pour la TVA, hors champ OSS).
 * Toute autre destination de `SHIPPING_COUNTRIES` est un État membre UE → comptée.
 */
export const EU_OSS_EXCLUDED_COUNTRIES = ["FR", "MC"] as const;
