/**
 * SSOT du traitement visuel des sous-cards de section de formulaire admin
 * (Créer/Éditer Produit, Variante, Code promo, etc.).
 *
 * Évite la dérive entre les ~10 sections de formulaire des modules products
 * et discounts, où le chrome de card et la typo de titre étaient dupliqués
 * inline (ou redéfinis localement par module).
 *
 * - `FORM_SECTION_CARD_CLASS` : chrome mobile-flat → desktop-card. Appliqué à
 *   la `<Card role="region">` qui enveloppe chaque section. Mobile : pas de
 *   bordure/ombre/fond (densité iOS). Desktop (`lg:`) : Card complète.
 * - `FORM_SECTION_TITLE_CLASS` : titre mobile-first (uppercase tracking-wide,
 *   petit) avec override desktop (`lg:`) qui revient à la typographie standard.
 */
export const FORM_SECTION_CARD_CLASS =
	"lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md";

export const FORM_SECTION_TITLE_CLASS =
	"text-muted-foreground text-sm font-semibold tracking-wide uppercase lg:text-foreground lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal";
