/**
 * Style partagé entre les sub-cards des formulaires Créer/Éditer Produit et
 * Créer/Éditer Variante (sidebar). Re-export de la SSOT cross-module
 * `@/shared/components/forms/form-section-styles` (partagée avec discounts).
 *
 * L'alias `MOBILE_SECTION_TITLE` a été retiré le 2026-08-07 : il était conservé
 * « pour stabilité des imports » alors qu'aucun import ne le visait.
 */
export {
	FORM_SECTION_ACCENT_CLASS,
	FORM_SECTION_CARD_CLASS,
} from "@/shared/components/forms/form-section-styles";
