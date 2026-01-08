/**
 * Form options partagées entre client et serveur pour le formulaire de personnalisation
 */
export const CUSTOMIZATION_FORM_OPTIONS = {
	defaultValues: {
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
	},
};
