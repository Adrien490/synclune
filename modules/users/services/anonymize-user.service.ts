import { AccountStatus, NewsletterStatus, type Prisma } from "@/app/generated/prisma/client";
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
	userId: string
): Promise<void> {
	// Guard: only anonymize users that are pending deletion (race condition with cancellation)
	const user = await tx.user.findUnique({
		where: { id: userId },
		select: { accountStatus: true },
	});

	if (user?.accountStatus !== AccountStatus.PENDING_DELETION) {
		throw new Error(
			`Cannot anonymize user ${userId}: status is ${user?.accountStatus ?? "not found"}, expected PENDING_DELETION`
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

	// 7. Delete review media (potential PII: faces, identifiable decor)
	await tx.reviewMedia.deleteMany({
		where: { review: { userId } },
	});

	// 8. Anonymize review content
	await tx.productReview.updateMany({
		where: { userId },
		data: {
			content: "Contenu supprimé suite à la suppression du compte.",
			title: null,
		},
	});

	// 9. Unsubscribe and anonymize newsletter (including IP addresses - RGPD PII)
	await tx.newsletterSubscriber.updateMany({
		where: { userId },
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
		where: { userId },
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
