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

		// Détails de personnalisation
		jewelryType: "",
		customizationDetails: "",

		// Consentements
		rgpdConsent: false,

		// Anti-spam (honeypot)
		website: "",
	},
};
