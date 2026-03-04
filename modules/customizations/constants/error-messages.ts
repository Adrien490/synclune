/**
 * Centralized error messages for the customizations module
 * All messages in French for consistent user experience
 */

export const CUSTOMIZATION_ERROR_MESSAGES = {
	REQUEST_NOT_FOUND: "Demande non trouvée",
	NO_REQUESTS_FOUND: "Aucune demande trouvée",
	NO_VALID_TRANSITIONS: "Aucune transition de statut valide",
	INVALID_TRANSITION: "Transition de statut non autorisée",
	CONCURRENT_MODIFICATION:
		"Le statut a été modifié par un autre administrateur. Veuillez rafraîchir la page.",
	EMAIL_RATE_LIMITED: "Trop de demandes pour cette adresse email. Réessayez demain.",
	CREATE_ERROR: "Une erreur est survenue lors de l'envoi de votre demande.",
	UPDATE_STATUS_ERROR: "Erreur lors de la mise à jour du statut",
	UPDATE_NOTES_ERROR: "Erreur lors de la mise à jour des notes",
	BULK_UPDATE_ERROR: "Erreur lors de la mise à jour en masse",
} as const;

export const CUSTOMIZATION_SUCCESS_MESSAGES = {
	REQUEST_SENT:
		"Votre demande de personnalisation a bien été envoyée. Nous vous répondrons dans les plus brefs délais.",
	STATUS_UPDATED: "Statut mis à jour",
	NOTES_UPDATED: "Notes mises à jour",
	NOTES_DELETED: "Notes supprimées",
	BULK_UPDATED: (count: number) =>
		`${count} demande${count > 1 ? "s" : ""} mise${count > 1 ? "s" : ""} à jour`,
} as const;
