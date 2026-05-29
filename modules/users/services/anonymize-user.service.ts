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

	// 11. Anonymiser le nom dénormalisé de l'auteur sur les réponses d'avis PUBLIQUES.
	// Contrairement à OrderHistory/OrderNote.authorName (audit trail comptable interne,
	// base Art. L123-22, conservés), une ReviewResponse est du contenu marketing affiché
	// publiquement sur le storefront : le nom d'un admin/staff anonymisé ne doit pas y
	// rester visible. On rebascule sur la marque (valeur de fallback déjà utilisée à la
	// création). Cf. RGPD-AUDIT F3.
	await tx.reviewResponse.updateMany({
		where: { authorId: userId },
		data: { authorName: "Synclune" },
	});

	// 12. Anonymise la PII dénormalisée des commandes — UNIQUEMENT les surfaces
	// opérationnelles non requises par la facture légale (admin UI, étiquettes
	// d'expédition, espace client) : email/nom/téléphone client + adresse de LIVRAISON.
	//
	// IMPORTANT — surfaces délibérément CONSERVÉES (NE PAS scrubber ici, verrouillé par
	// la régression `rgpd-anonymize-preserves-invoice-snapshot-2026-05-28`) :
	//   - `billing*` : adresse de FACTURATION = identité légale du client sur la facture
	//     (Art. 289 CGI). La franchise de l'effacement RGPD vaut tant que la base légale
	//     de conservation court (Art. 17(3)(b) RGPD).
	//   - `invoiceDataSnapshot`/`invoiceDataHash` + PDF facture/avoir (`invoicePdfUrl`,
	//     `creditNotePdfUrl`) : facture figée immuable (Art. L102 B LPF) — un PDF régénéré
	//     doit rester bit-identique à l'archive.
	// Ces surfaces sont conservées jusqu'à `paidAt + 10 ans` puis purgées par le cron
	// `hard-delete-retention` (RGPD Art. 5.1.e une fois la base légale expirée).
	// Cf. docs/INVOICING.md § Rétention PII vs RGPD / RGPD-AUDIT F1+F2.
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
