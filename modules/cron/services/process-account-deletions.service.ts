import { updateTag } from "next/cache";
import { AccountStatus, NewsletterStatus } from "@/app/generated/prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { deleteUploadThingFileFromUrl, deleteUploadThingFilesFromUrls } from "@/modules/media/services/delete-uploadthing-files.service";
import { BATCH_DEADLINE_MS, BATCH_SIZE_MEDIUM, RETENTION } from "@/modules/cron/constants/limits";
import { NEWSLETTER_CACHE_TAGS } from "@/modules/newsletter/constants/cache";
import { REVIEWS_CACHE_TAGS } from "@/modules/reviews/constants/cache";
import { sendAccountDeletionEmail } from "@/modules/emails/services/auth-emails";

/**
 * Processes GDPR account deletion requests.
 *
 * After the 30-day grace period, anonymizes personal data for users
 * who requested account deletion.
 *
 * Note: Accounting data (Order, Refund) is retained for 10 years
 * per French Commercial Code Art. L123-22.
 */
export async function processAccountDeletions(): Promise<{
	processed: number;
	errors: number;
	hasMore: boolean;
}> {
	console.log(
		"[CRON:process-account-deletions] Starting account deletion processing..."
	);

	const gracePeriodEnd = new Date(
		Date.now() - RETENTION.GDPR_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000
	);

	// Find PENDING_DELETION accounts past the grace period
	const accountsToAnonymize = await prisma.user.findMany({
		where: {
			accountStatus: AccountStatus.PENDING_DELETION,
			deletionRequestedAt: { lt: gracePeriodEnd },
			anonymizedAt: null,
		},
		select: {
			id: true,
			email: true,
			name: true,
			image: true,
		},
		take: BATCH_SIZE_MEDIUM,
	});

	console.log(
		`[CRON:process-account-deletions] Found ${accountsToAnonymize.length} accounts to anonymize`
	);

	const startTime = Date.now();
	let processed = 0;
	let errors = 0;

	for (const user of accountsToAnonymize) {
		if (Date.now() - startTime > BATCH_DEADLINE_MS) {
			console.log("[CRON:process-account-deletions] Deadline reached, stopping early");
			break;
		}

		try {
			// Save data needed after transaction (will be wiped during anonymization)
			const avatarUrl = user.image;
			const emailBeforeAnonymization = user.email;
			const nameBeforeAnonymization = user.name || "Client";

			// Collect review media URLs for UploadThing cleanup after transaction
			const reviewMedias = await prisma.reviewMedia.findMany({
				where: { review: { userId: user.id } },
				select: { url: true },
			});
			const reviewMediaUrls = reviewMedias.map((m) => m.url);

			const anonymizedEmail = `anonymized-${user.id}@deleted.local`;
			const now = new Date();

			await prisma.$transaction(async (tx) => {
				// 1. Anonymize user data
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

				// 2. Delete sessions
				await tx.session.deleteMany({
					where: { userId: user.id },
				});

				// 3. Delete OAuth accounts (links, not data)
				await tx.account.deleteMany({
					where: { userId: user.id },
				});

				// 4. Delete addresses
				await tx.address.deleteMany({
					where: { userId: user.id },
				});

				// 5. Delete cart
				await tx.cart.deleteMany({
					where: { userId: user.id },
				});

				// 6. Delete wishlist
				await tx.wishlist.deleteMany({
					where: { userId: user.id },
				});

				// 7. Delete review media (potential PII: faces, identifiable decor)
				await tx.reviewMedia.deleteMany({
					where: { review: { userId: user.id } },
				});

				// 8. Anonymize review content
				await tx.productReview.updateMany({
					where: { userId: user.id },
					data: {
						content: "Contenu supprimé suite à la suppression du compte.",
						title: null,
					},
				});

				// 9. Unsubscribe and anonymize newsletter (including IP addresses - RGPD PII)
				await tx.newsletterSubscriber.updateMany({
					where: { userId: user.id },
					data: {
						status: NewsletterStatus.UNSUBSCRIBED,
						email: anonymizedEmail,
						unsubscribedAt: now,
						deletedAt: now,
						ipAddress: null,
						confirmationIpAddress: null,
						userAgent: null,
					},
				});

				// 10. Anonymize PII in customization requests
				await tx.customizationRequest.updateMany({
					where: { userId: user.id },
					data: {
						firstName: "Anonyme",
						email: anonymizedEmail,
						phone: null,
						details: "Contenu supprimé",
					},
				});

				// 11. Anonymize PII denormalized in orders
				// Legal retention 10 years (Art. L123-22 Code de Commerce):
				// keep amounts and accounting IDs, anonymize personal data
				await tx.order.updateMany({
					where: { userId: user.id },
					data: {
						customerEmail: anonymizedEmail,
						customerName: "Client supprimé",
						customerPhone: null,
						shippingFirstName: "X",
						shippingLastName: "X",
						shippingAddress1: "Adresse supprimée",
						shippingAddress2: null,
						shippingPostalCode: "00000",
						shippingCity: "Supprimé",
						shippingPhone: "",
						stripeCustomerId: null,
					},
				});
			});

			// Send deletion confirmation email AFTER successful transaction
			// (prevents sending false confirmations if the transaction fails)
			try {
				const deletionDate = new Date().toLocaleDateString("fr-FR", {
					weekday: "long",
					year: "numeric",
					month: "long",
					day: "numeric",
				});
				await sendAccountDeletionEmail({
					to: emailBeforeAnonymization,
					userName: nameBeforeAnonymization,
					deletionDate,
				});
			} catch {
				// Non-blocking: continue even if email fails
			}

			// Invalidate user-related caches
			updateTag(NEWSLETTER_CACHE_TAGS.LIST);
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

			// Delete review media from UploadThing AFTER successful transaction
			if (reviewMediaUrls.length > 0) {
				try {
					await deleteUploadThingFilesFromUrls(reviewMediaUrls);
				} catch (mediaError) {
					console.warn(
						`[CRON:process-account-deletions] Failed to delete review media for ${user.id}:`,
						mediaError instanceof Error
							? mediaError.message
							: String(mediaError)
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
		hasMore: accountsToAnonymize.length === BATCH_SIZE_MEDIUM,
	};
}
