/**
 * Form options partagées entre client et serveur pour le formulaire de personnalisation
 */
export const customizationFormOpts = {
	defaultValues: {
		// Informations personnelles
		firstName: "",
		lastName: "",
		email: "",
		phone: "",

		// Type de produit
		productTypeLabel: "",

		// Inspirations et préférences
		inspirationProductIds: [] as string[],
		preferredColorIds: [] as string[],
		preferredMaterialIds: [] as string[],

		// Détails de personnalisation
		details: "",

		// Consentements
		rgpdConsent: false,

		// Anti-spam (honeypot)
		website: "",
	},
};
