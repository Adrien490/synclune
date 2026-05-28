import { AccountStatus, ReviewStatus, type Prisma } from "@/app/generated/prisma/client";
import { recomputeProductReviewStatsBatch } from "@/modules/reviews/services/review-stats.service";
import { generateAnonymizedEmail } from "../utils/anonymization.utils";

/**
 * Anonymizes a user's personal data within a Prisma transaction.
 *
 * Shared between:
 * - `process-account-deletions` cron (after 30-day grace period)
 * - Any future direct anonymization flow
 *
 * Callers are responsible for external side effects (Stripe, UploadThing, email)
 * AFTER the transaction commits.
 */
export async function anonymizeUserInTransaction(
	tx: Prisma.TransactionClient,
	userId: string,
	options: { allowImmediate?: boolean } = {},
): Promise<void> {
	const user = await tx.user.findUnique({
		where: { id: userId },
		select: { accountStatus: true },
	});

	// Idempotence: already anonymized → no-op
	if (user?.accountStatus === AccountStatus.ANONYMIZED) {
		return;
	}

	// Default path: only anonymize users that are pending deletion (race with cancellation)
	// Immediate path (admin override): also accept ACTIVE or INACTIVE
	const allowedStatuses = options.allowImmediate
		? [AccountStatus.PENDING_DELETION, AccountStatus.ACTIVE, AccountStatus.INACTIVE]
		: [AccountStatus.PENDING_DELETION];

	if (!user || !allowedStatuses.includes(user.accountStatus)) {
		throw new Error(
			`Cannot anonymize user ${userId}: status is ${user?.accountStatus ?? "not found"}, expected ${allowedStatuses.join("|")}`,
		);
	}

	const anonymizedEmail = generateAnonymizedEmail(userId);
	const now = new Date();

	// 1. Anonymize user data
	await tx.user.update({
		where: { id: userId },
		data: {
			accountStatus: AccountStatus.ANONYMIZED,
			email: anonymizedEmail,
			name: "Utilisateur supprimé",
			image: null,
			stripeCustomerId: null,
			deletionRequestedAt: null,
			anonymizedAt: now,
			deletedAt: now,
		},
	});

	// 2. Delete sessions
	await tx.session.deleteMany({
		where: { userId },
	});

	// 3. Delete OAuth accounts
	await tx.account.deleteMany({
		where: { userId },
	});

	// 4. Delete addresses
	await tx.address.deleteMany({
		where: { userId },
	});

	// 5. Delete cart
	await tx.cart.deleteMany({
		where: { userId },
	});

	// 6. Delete wishlist
	await tx.wishlist.deleteMany({
		where: { userId },
	});

	// 7. Récupérer les produits concernés avant mutation (recompute stats ci-dessous ;
	// l'invalidation de cache produit côté appelant est gérée par le cron). Cf. REVIEW-AUDIT-002.
	const reviewedProducts = await tx.productReview.findMany({
		where: { userId, productId: { not: null } },
		select: { productId: true },
		distinct: ["productId"],
	});
	const reviewedProductIds = reviewedProducts
		.map((r) => r.productId)
		.filter((id): id is string => id !== null);

	// 8. Delete review media (potential PII: faces, identifiable decor)
	await tx.reviewMedia.deleteMany({
		where: { review: { userId } },
	});

	// 9. Masquer + anonymiser les avis. HIDDEN les retire du storefront ET des stats :
	// l'auteur n'existe plus, et un avis « Contenu supprimé » publié n'a aucune valeur.
	// Cf. REVIEW-AUDIT-005.
	await tx.productReview.updateMany({
		where: { userId },
		data: {
			status: ReviewStatus.HIDDEN,
			content: "Contenu supprimé suite à la suppression du compte.",
			title: null,
		},
	});

	// 10. Recalculer les stats des produits concernés (les avis masqués ne comptent plus).
	// Cf. REVIEW-AUDIT-002 / REVIEW-AUDIT-005.
	await recomputeProductReviewStatsBatch(tx, reviewedProductIds);

	// 9. Anonymize PII denormalized in orders
	// Legal retention 10 years (Art. L123-22 Code de Commerce):
	// keep amounts and accounting IDs, anonymize personal data
	await tx.order.updateMany({
		where: { userId },
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
			shippingPhone: "0000000000",
			stripeCustomerId: null,
		},
	});
}
