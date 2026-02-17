/**
 * Messages d'erreur d'authentification
 * Affichés sur la page /error avec le paramètre ?error=xxx
 */
export const AUTH_ERROR_MESSAGES: Record<
	string,
	{ title: string; description: string }
> = {
	unable_to_create_user: {
		title: "Impossible de créer votre compte",
		description:
			"Une erreur est survenue lors de la création de votre compte. Réessayez ou inscrivez-vous avec une autre méthode.",
	},
	user_already_exists: {
		title: "Compte existant",
		description:
			"Un compte avec cette adresse email existe déjà. Connectez-vous ou utilisez une autre adresse email.",
	},
	invalid_credentials: {
		title: "Identifiants invalides",
		description:
			"L'adresse email ou le mot de passe est incorrect. Réessayez.",
	},
	email_not_verified: {
		title: "Email non vérifié",
		description:
			"Vérifiez votre adresse email avant de vous connecter. Un email de vérification a été envoyé à votre adresse.",
	},
	default: {
		title: "Erreur d'authentification",
		description:
			"Une erreur inattendue est survenue. Réessayez ultérieurement.",
	},
}

/**
 * Récupère le message d'erreur approprié pour un code donné
 * Retourne le message "default" si le code n'est pas reconnu
 */
export function getAuthErrorMessage(errorType?: string) {
	return AUTH_ERROR_MESSAGES[errorType || "default"] || AUTH_ERROR_MESSAGES.default
}
