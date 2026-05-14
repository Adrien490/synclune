import { CircleAlert, CircleX, Clock, type LucideIcon } from "lucide-react";

/**
 * Messages d'erreur spécifiques pour la page d'annulation de paiement.
 *
 * Avec Stripe Checkout Sessions (embedded), les erreurs liées à la carte
 * (refus, 3DS, fonds insuffisants…) sont gérées entièrement par Stripe dans
 * l'iframe — l'utilisateur peut réessayer immédiatement sans quitter la page.
 * On ne reçoit donc plus que les motifs suivants côté Synclune.
 */
export const CHECKOUT_CANCEL_MESSAGES: Record<
	string,
	{ title: string; description: string; icon: LucideIcon }
> = {
	processing_error: {
		title: "Erreur de traitement",
		description:
			"Une erreur s'est produite lors de la vérification de votre paiement. Réessayez dans quelques instants.",
		icon: CircleX,
	},
	expired: {
		title: "Session expirée",
		description:
			"Votre session de paiement a expiré (30 min). Aucun montant n'a été débité — vous pouvez relancer la commande.",
		icon: Clock,
	},
	canceled: {
		title: "Paiement annulé",
		description:
			"Vous avez annulé le processus de paiement. Aucun montant n'a été débité de votre compte.",
		icon: CircleAlert,
	},
};

/**
 * Récupère le message d'erreur approprié pour un code donné
 * Retourne le message "canceled" par défaut
 */
export function getCheckoutCancelMessage(reason?: string): {
	title: string;
	description: string;
	icon: LucideIcon;
} {
	if (reason) {
		const message = CHECKOUT_CANCEL_MESSAGES[reason];
		if (message) return message;
	}
	return CHECKOUT_CANCEL_MESSAGES["canceled"]!;
}
