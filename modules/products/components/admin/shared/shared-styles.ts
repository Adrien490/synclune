/**
 * Style partagé entre les sub-cards des formulaires Créer/Éditer Produit et
 * Créer/Éditer Variante (sidebar). Re-export de la SSOT cross-module
 * `@/shared/components/forms/form-section-styles` (partagée avec discounts).
 *
 * `MOBILE_SECTION_TITLE` conserve son nom historique pour stabilité des imports.
 */
export {
	FORM_SECTION_ACCENT_CLASS,
	FORM_SECTION_CARD_CLASS,
	FORM_SECTION_TITLE_CLASS as MOBILE_SECTION_TITLE,
} from "@/shared/components/forms/form-section-styles";
