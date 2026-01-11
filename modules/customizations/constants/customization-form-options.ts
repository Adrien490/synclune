/**
 * Valeurs par défaut du formulaire de personnalisation
 */
export const CUSTOMIZATION_DEFAULT_VALUES = {
	// Informations personnelles
	firstName: "",
	email: "",
	phone: "",

	// Type de produit
	productTypeLabel: "",

	// Détails de personnalisation
	details: "",

	// Consentements
	rgpdConsent: false,

	// Anti-spam (honeypot)
	website: "",
};

/**
 * Form options partagées entre client et serveur pour le formulaire de personnalisation
 * Note: La validation est faite inline dans le composant pour la compatibilité de types
 * et côté serveur via le schema Zod
 */
export const CUSTOMIZATION_FORM_OPTIONS = {
	defaultValues: CUSTOMIZATION_DEFAULT_VALUES,
};
