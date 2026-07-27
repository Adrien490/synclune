/**
 * Codes catégorie TVA — CEFACT UNTDID 5305.
 *
 * ⚠️ Aucune colonne DB ne porte ces codes : `OrderItem.taxCategoryCode` a été
 * supprimée par la migration `20260528250000_simplify_b2c_einvoicing`. Ils sont
 * dérivés à la volée par `build-invoice-data.ts` / `build-credit-note-data.ts`
 * et figés dans `Order.invoiceDataSnapshot` (mapping BT-151 Item VAT category
 * pour de futurs renderers Factur-X / UBL / CII).
 *
 * Synclune est aujourd'hui en franchise TVA (Art. 293 B CGI) → toutes les
 * lignes émises utilisent `ZB`. Les autres codes sont préparés pour la
 * bascule régime réel ou les ventes export.
 */
export const TAX_CATEGORY_CODES = {
	/** Standard rate — TVA appliquée au taux normal (20% FR). */
	STANDARD: "S",
	/** Zero rate — taux 0% (différent de l'exonération). */
	ZERO: "Z",
	/** Exempt — exonéré franchise art. 293 B CGI (Synclune actuel). */
	EXEMPT_FRANCHISE: "ZB",
	/** Reverse charge — autoliquidation (B2B intra-UE). */
	REVERSE_CHARGE: "AE",
	/** Exempt — exonéré pour autre motif (ex: article 261). */
	EXEMPT: "E",
	/** Export — vente à l'export hors UE. */
	EXPORT: "G",
	/** Intra-community — livraison intracommunautaire B2B. */
	INTRA_COMMUNITY: "K",
} as const satisfies Record<string, string>;

export type TaxCategoryCode = (typeof TAX_CATEGORY_CODES)[keyof typeof TAX_CATEGORY_CODES];

/**
 * Catégorie par défaut pour les ventes Synclune actuelles (micro-entreprise
 * franchise TVA).
 */
export const DEFAULT_TAX_CATEGORY: TaxCategoryCode = TAX_CATEGORY_CODES.EXEMPT_FRANCHISE;
