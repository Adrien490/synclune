import { AccountStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";

const GRACE_PERIOD_DAYS = 30; // 30 jours de délai de rétractation RGPD

/**
 * Service de traitement des suppressions de compte RGPD
 *
 * Après la période de grâce de 30 jours, anonymise les données
 * personnelles des utilisateurs ayant demandé la suppression.
 *
 * Note: Les données comptables (Order, Refund) sont conservées 10 ans
 * conformément à l'Art. L123-22 du Code de Commerce.
 */
export async function processAccountDeletions(): Promise<{
	processed: number;
	errors: number;
}> {
	console.log(
		"[CRON:process-account-deletions] Starting account deletion processing..."
	);

	const gracePeriodEnd = new Date(
		Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
	);

	// Trouver les comptes PENDING_DELETION dont la période de grâce est terminée
	const accountsToAnonymize = await prisma.user.findMany({
		where: {
			accountStatus: AccountStatus.PENDING_DELETION,
			deletionRequestedAt: { lt: gracePeriodEnd },
			anonymizedAt: null,
		},
		select: {
			id: true,
			email: true,
		},
		take: 50, // Limiter pour éviter timeout
	});

	console.log(
		`[CRON:process-account-deletions] Found ${accountsToAnonymize.length} accounts to anonymize`
	);

	let processed = 0;
	let errors = 0;

	for (const user of accountsToAnonymize) {
		try {
			const anonymizedEmail = `anonymized-${user.id}@deleted.local`;
			const now = new Date();

			await prisma.$transaction(async (tx) => {
				// 1. Anonymiser les données utilisateur
				await tx.user.update({
					where: { id: user.id },
					data: {
						accountStatus: AccountStatus.ANONYMIZED,
						email: anonymizedEmail,
						name: "Utilisateur supprimé",
						image: null,
						stripeCustomerId: null,
						signupIpAddress: null,
						signupUserAgent: null,
						marketingEmailConsentedAt: null,
						marketingConsentSource: null,
						anonymizedAt: now,
						deletedAt: now,
					},
				});

				// 2. Supprimer les sessions
				await tx.session.deleteMany({
					where: { userId: user.id },
				});

				// 3. Supprimer les comptes OAuth (pas les données, juste les liens)
				await tx.account.deleteMany({
					where: { userId: user.id },
				});

				// 4. Supprimer les adresses
				await tx.address.deleteMany({
					where: { userId: user.id },
				});

				// 5. Supprimer le panier
				await tx.cart.deleteMany({
					where: { userId: user.id },
				});

				// 6. Supprimer la wishlist
				await tx.wishlist.deleteMany({
					where: { userId: user.id },
				});

				// Note: On ne supprime PAS les commandes (Order)
				// ni les remboursements (Refund) - conservation légale 10 ans
				// Les commandes sont anonymisées via l'email du user (userId devient null)
			});

			console.log(
				`[CRON:process-account-deletions] Anonymized account ${user.id}`
			);
			processed++;
		} catch (error) {
			console.error(
				`[CRON:process-account-deletions] Error anonymizing account ${user.id}:`,
				error
			);
			errors++;
		}
	}

	console.log(
		`[CRON:process-account-deletions] Completed: ${processed} processed, ${errors} errors`
	);

	return {
		processed,
		errors,
	};
}
