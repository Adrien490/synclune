import { updateTag } from "next/cache";
import { AccountStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { deleteUploadThingFileFromUrl } from "@/modules/media/services/delete-uploadthing-files.service";
import { BATCH_SIZE_LARGE, RETENTION } from "@/modules/cron/constants/limits";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";

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
		Date.now() - RETENTION.GDPR_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
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
			image: true,
		},
		take: BATCH_SIZE_LARGE,
	});

	console.log(
		`[CRON:process-account-deletions] Found ${accountsToAnonymize.length} accounts to anonymize`
	);

	let processed = 0;
	let errors = 0;

	for (const user of accountsToAnonymize) {
		try {
			// Save avatar URL before transaction (will be deleted after success)
			const avatarUrl = user.image;

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

				// Note: On ne supprime PAS les commandes (Order) ni les remboursements (Refund)
				// Conservation légale 10 ans (Art. L123-22 Code de Commerce)
				// userId reste dans Order pour traçabilité, mais les données personnelles
				// du user sont anonymisées (email, nom, adresse IP, etc.)
			});

			// Invalidate user-related caches
			updateTag(REVIEWS_CACHE_TAGS.USER(user.id));
			updateTag(REVIEWS_CACHE_TAGS.REVIEWABLE(user.id));

			// Delete avatar from UploadThing AFTER successful transaction
			if (avatarUrl) {
				try {
					await deleteUploadThingFileFromUrl(avatarUrl);
				} catch (avatarError) {
					// Non-blocking: avatar becomes orphan, cleaned up by cleanup-orphan-media
					console.warn(
						`[CRON:process-account-deletions] Failed to delete avatar for ${user.id}:`,
						avatarError instanceof Error
							? avatarError.message
							: String(avatarError)
					);
				}
			}

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
