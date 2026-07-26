import { CircleAlert, CreditCard, CircleX, type LucideIcon } from "lucide-react";

export const CHECKOUT_CANCEL_REASONS = [
	"card_declined",
	"expired_card",
	"insufficient_funds",
	"authentication_failed",
	"processing_error",
	"payment_failed",
	"expired",
	"canceled",
] as const;

interface CheckoutCancelMessage {
	title: string;
	description: string;
	advice?: string;
	icon: LucideIcon;
}

/**
 * Messages d'erreur Stripe mappés aux codes de retour.
 * `advice` est rendu sous forme de conseil contextuel sur la page annulation.
 */
export const CHECKOUT_CANCEL_MESSAGES: Record<string, CheckoutCancelMessage> = {
	card_declined: {
		title: "Carte refusée",
		description:
			"Ta carte bancaire a été refusée par ta banque. Vérifie tes informations ou utilise une autre carte.",
		advice:
			"Vérifie que ta carte est activée pour les paiements en ligne, ou contacte ta banque si le problème persiste.",
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
			"Ton compte ne dispose pas de fonds suffisants pour cette transaction. Vérifie ton solde ou utilise une autre carte.",
		advice: "Vérifie ton solde ou utilise une autre carte bancaire.",
		icon: CreditCard,
	},
	authentication_failed: {
		title: "Authentification échouée",
		description: "L'authentification 3D Secure a échoué. Réessaie ou contacte ta banque.",
		advice:
			"Assure-toi d'avoir accès à ton application bancaire ou SMS pour valider l'authentification 3D Secure.",
		icon: CircleX,
	},
	processing_error: {
		title: "Erreur de traitement",
		description:
			"Une erreur s'est produite lors du traitement de ton paiement. Réessaie dans quelques instants.",
		icon: CircleX,
	},
	payment_failed: {
		title: "Paiement échoué",
		description:
			"Le paiement n'a pas pu aboutir. Réessaie avec une autre carte ou contacte ta banque.",
		icon: CircleX,
	},
	expired: {
		title: "Session expirée",
		description: "Le délai de paiement a expiré. Reprends ta commande pour la finaliser.",
		icon: CircleAlert,
	},
	canceled: {
		title: "Paiement annulé",
		description:
			"Tu as annulé le processus de paiement. Aucun montant n'a été débité de ton compte.",
		advice: "Si tu as rencontré un problème lors du paiement, n'hésite pas à me contacter !",
		icon: CircleAlert,
	},
};

/**
 * Récupère le message d'erreur approprié pour un code donné.
 * Retourne le message "canceled" par défaut.
 */
export function getCheckoutCancelMessage(reason?: string): CheckoutCancelMessage {
	if (reason) {
		const message = CHECKOUT_CANCEL_MESSAGES[reason];
		if (message) return message;
	}
	return CHECKOUT_CANCEL_MESSAGES["canceled"]!;
}
