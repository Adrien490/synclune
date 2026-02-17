import { AlertCircle, CreditCard, XCircle, type LucideIcon } from "lucide-react"

/**
 * Messages d'erreur spécifiques pour la page d'annulation de paiement
 * Mappés aux codes d'erreur Stripe
 */
export const CHECKOUT_CANCEL_MESSAGES: Record<
	string,
	{ title: string; description: string; icon: LucideIcon }
> = {
	card_declined: {
		title: "Carte refusée",
		description:
			"Votre carte bancaire a été refusée par votre banque. Vérifiez vos informations ou utilisez une autre carte.",
		icon: CreditCard,
	},
	expired_card: {
		title: "Carte expirée",
		description: "Votre carte bancaire a expiré. Utilisez une carte valide.",
		icon: CreditCard,
	},
	insufficient_funds: {
		title: "Fonds insuffisants",
		description:
			"Votre compte ne dispose pas de fonds suffisants pour effectuer cette transaction. Vérifiez votre solde ou utilisez une autre carte.",
		icon: CreditCard,
	},
	authentication_failed: {
		title: "Authentification échouée",
		description:
			"L'authentification 3D Secure a échoué. Réessayez ou contactez votre banque.",
		icon: XCircle,
	},
	processing_error: {
		title: "Erreur de traitement",
		description:
			"Une erreur s'est produite lors du traitement de votre paiement. Réessayez dans quelques instants.",
		icon: XCircle,
	},
	canceled: {
		title: "Paiement annulé",
		description:
			"Vous avez annulé le processus de paiement. Aucun montant n'a été débité de votre compte.",
		icon: AlertCircle,
	},
}

/**
 * Récupère le message d'erreur approprié pour un code donné
 * Retourne le message "canceled" par défaut
 */
export function getCheckoutCancelMessage(reason?: string) {
	return reason && CHECKOUT_CANCEL_MESSAGES[reason]
		? CHECKOUT_CANCEL_MESSAGES[reason]
		: CHECKOUT_CANCEL_MESSAGES.canceled
}
