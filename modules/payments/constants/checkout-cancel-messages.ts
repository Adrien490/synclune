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
			"Ta carte bancaire a été refusée par ta banque. Vérifie tes informations ou utilise une autre carte.",
		icon: CreditCard,
	},
	expired_card: {
		title: "Carte expirée",
		description: "Ta carte bancaire a expiré. Utilise une carte valide.",
		icon: CreditCard,
	},
	insufficient_funds: {
		title: "Fonds insuffisants",
		description:
			"Ton compte ne dispose pas de fonds suffisants pour effectuer cette transaction. Vérifie ton solde ou utilise une autre carte.",
		icon: CreditCard,
	},
	authentication_failed: {
		title: "Authentification échouée",
		description:
			"L'authentification 3D Secure a échoué. Réessaye ou contacte ta banque.",
		icon: XCircle,
	},
	processing_error: {
		title: "Erreur de traitement",
		description:
			"Une erreur s'est produite lors du traitement de ton paiement. Réessaye dans quelques instants.",
		icon: XCircle,
	},
	canceled: {
		title: "Paiement annulé",
		description:
			"Tu as annulé le processus de paiement. Aucun montant n'a été débité de ton compte.",
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
