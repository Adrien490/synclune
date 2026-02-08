import { NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { RETENTION } from "@/modules/cron/constants/limits";

/**
 * Service de nettoyage des abonnements newsletter non confirmés
 *
 * Supprime les abonnements PENDING dont le double opt-in n'a pas été
 * complété dans les 7 jours suivant l'inscription.
 */
export async function cleanupUnconfirmedNewsletterSubscriptions(): Promise<{
	deleted: number;
}> {
	console.log(
		"[CRON:cleanup-newsletter] Starting unconfirmed subscriptions cleanup..."
	);

	const expiryDate = new Date(
		Date.now() - RETENTION.NEWSLETTER_CONFIRMATION_DAYS * 24 * 60 * 60 * 1000
	);

	// Supprimer les abonnements non confirmés après 7 jours
	const deleteResult = await prisma.newsletterSubscriber.deleteMany({
		where: {
			status: NewsletterStatus.PENDING,
			confirmationSentAt: { lt: expiryDate },
			confirmedAt: null,
		},
	});

	console.log(
		`[CRON:cleanup-newsletter] Deleted ${deleteResult.count} unconfirmed subscriptions`
	);

	return {
		deleted: deleteResult.count,
	};
}
