import { prisma } from "@/shared/lib/prisma";
import { sendAbandonedCartEmail } from "@/modules/emails/services/cart-emails";
import { buildUrl, ROUTES } from "@/shared/constants/urls";
import { logger } from "@/shared/lib/logger";
import {
	BATCH_DEADLINE_MS,
	BATCH_SIZE_MEDIUM,
	EMAIL_THROTTLE_MS,
} from "@/modules/cron/constants/limits";

// Send abandoned cart email 2 hours after last cart update
const ABANDONMENT_DELAY_MS = 2 * 60 * 60 * 1000;

/**
 * Sends abandoned cart recovery emails to authenticated users
 * who have items in their cart but haven't checked out.
 *
 * Only targets authenticated users (we have their email).
 * Guest carts without email are excluded.
 */
export async function sendAbandonedCartEmails(): Promise<{
	found: number;
	sent: number;
	errors: number;
	hasMore: boolean;
}> {
	logger.info("Starting abandoned cart recovery", { cronJob: "abandoned-cart-emails" });

	const abandonmentThreshold = new Date(Date.now() - ABANDONMENT_DELAY_MS);

	// Find authenticated carts with items, updated more than 2h ago, not yet emailed
	const abandonedCarts = await prisma.cart.findMany({
		where: {
			userId: { not: null },
			abandonedEmailSentAt: null,
			updatedAt: { lt: abandonmentThreshold },
			items: { some: {} },
		},
		select: {
			id: true,
			user: {
				select: {
					email: true,
					name: true,
				},
			},
			items: {
				select: {
					quantity: true,
					priceAtAdd: true,
					sku: {
						select: {
							inventory: true,
							color: { select: { name: true } },
							material: { select: { name: true } },
							product: {
								select: { title: true },
							},
						},
					},
				},
			},
		},
		take: BATCH_SIZE_MEDIUM,
	});

	logger.info(`Found ${abandonedCarts.length} abandoned carts`, {
		cronJob: "abandoned-cart-emails",
	});

	const startTime = Date.now();
	let sent = 0;
	let errors = 0;
	const cartUrl = buildUrl(ROUTES.SHOP.CART);
	const unsubscribeUrl = buildUrl(ROUTES.NOTIFICATIONS.UNSUBSCRIBE);

	for (const cart of abandonedCarts) {
		if (Date.now() - startTime > BATCH_DEADLINE_MS) {
			logger.info("Deadline reached, stopping early", { cronJob: "abandoned-cart-emails" });
			break;
		}

		if (sent > 0 || errors > 0) {
			await new Promise((resolve) => setTimeout(resolve, EMAIL_THROTTLE_MS));
		}

		// Skip carts with out-of-stock items only (all items must be in stock)
		const hasAvailableItems = cart.items.some((item) => item.sku.inventory > 0);
		if (!hasAvailableItems) {
			// Mark as sent to avoid re-processing
			await prisma.cart.update({
				where: { id: cart.id },
				data: { abandonedEmailSentAt: new Date() },
			});
			continue;
		}

		try {
			const items = cart.items
				.filter((item) => item.sku.inventory > 0)
				.map((item) => ({
					productTitle: item.sku.product.title,
					skuColor: item.sku.color?.name ?? null,
					skuMaterial: item.sku.material?.name ?? null,
					quantity: item.quantity,
					price: item.priceAtAdd,
				}));

			const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

			const result = await sendAbandonedCartEmail({
				to: cart.user!.email,
				customerName: cart.user!.name ?? cart.user!.email,
				items,
				total,
				cartUrl,
				unsubscribeUrl,
			});

			if (result.success) {
				await prisma.cart.update({
					where: { id: cart.id },
					data: { abandonedEmailSentAt: new Date() },
				});
				sent++;
				logger.info("Email sent", { cronJob: "abandoned-cart-emails", cartId: cart.id });
			} else {
				errors++;
				logger.warn("Email failed", { cronJob: "abandoned-cart-emails", cartId: cart.id });
			}
		} catch (error) {
			errors++;
			logger.error("Error processing cart", error, {
				cronJob: "abandoned-cart-emails",
				cartId: cart.id,
			});
		}
	}

	logger.info(`Completed: ${sent} sent, ${errors} errors`, { cronJob: "abandoned-cart-emails" });

	return {
		found: abandonedCarts.length,
		sent,
		errors,
		hasMore: abandonedCarts.length === BATCH_SIZE_MEDIUM,
	};
}
