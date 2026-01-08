import { prisma } from "@/shared/lib/prisma";

const RETENTION_YEARS = 10; // Art. L123-22 Code de Commerce - Conservation 10 ans

/**
 * Service de suppression définitive après la période de rétention légale
 *
 * Supprime définitivement les données soft-deleted après 10 ans.
 *
 * IMPORTANT: Les données comptables (Order, Refund, OrderHistory, RefundHistory)
 * sont exclues car elles doivent être conservées indéfiniment pour audit.
 *
 * Tables concernées:
 * - Product (et ProductSku, SkuMedia, etc. en cascade)
 * - ProductReview, ReviewResponse, ReviewMedia (en cascade)
 * - NewsletterSubscriber
 * - StockNotificationRequest
 * - CustomizationRequest
 * - Wishlist (et WishlistItem en cascade)
 */
export async function hardDeleteExpiredRecords(): Promise<{
	productsDeleted: number;
	reviewsDeleted: number;
	newsletterDeleted: number;
	stockNotificationsDeleted: number;
	customizationRequestsDeleted: number;
	wishlistsDeleted: number;
}> {
	console.log(
		"[CRON:hard-delete-retention] Starting 10-year retention cleanup..."
	);

	const retentionDate = new Date();
	retentionDate.setFullYear(retentionDate.getFullYear() - RETENTION_YEARS);

	console.log(
		`[CRON:hard-delete-retention] Deleting records soft-deleted before ${retentionDate.toISOString()}`
	);

	// 1. Supprimer les avis produits (ReviewMedia et ReviewResponse supprimés en cascade)
	const reviewsResult = await prisma.productReview.deleteMany({
		where: {
			deletedAt: { lt: retentionDate },
		},
	});
	console.log(
		`[CRON:hard-delete-retention] Deleted ${reviewsResult.count} product reviews`
	);

	// 2. Supprimer les abonnements newsletter
	const newsletterResult = await prisma.newsletterSubscriber.deleteMany({
		where: {
			deletedAt: { lt: retentionDate },
		},
	});
	console.log(
		`[CRON:hard-delete-retention] Deleted ${newsletterResult.count} newsletter subscribers`
	);

	// 3. Supprimer les demandes de notification de stock
	const stockNotificationsResult =
		await prisma.stockNotificationRequest.deleteMany({
			where: {
				deletedAt: { lt: retentionDate },
			},
		});
	console.log(
		`[CRON:hard-delete-retention] Deleted ${stockNotificationsResult.count} stock notifications`
	);

	// 4. Supprimer les demandes de personnalisation
	const customizationRequestsResult =
		await prisma.customizationRequest.deleteMany({
			where: {
				deletedAt: { lt: retentionDate },
			},
		});
	console.log(
		`[CRON:hard-delete-retention] Deleted ${customizationRequestsResult.count} customization requests`
	);

	// 5. Supprimer les wishlists (WishlistItem supprimés en cascade)
	const wishlistsResult = await prisma.wishlist.deleteMany({
		where: {
			deletedAt: { lt: retentionDate },
		},
	});
	console.log(
		`[CRON:hard-delete-retention] Deleted ${wishlistsResult.count} wishlists`
	);

	// 6. Supprimer les produits archivés (ProductSku, SkuMedia, etc. en cascade)
	// Note: On supprime seulement les produits ARCHIVED + soft-deleted
	const productsResult = await prisma.product.deleteMany({
		where: {
			deletedAt: { lt: retentionDate },
			status: "ARCHIVED",
		},
	});
	console.log(
		`[CRON:hard-delete-retention] Deleted ${productsResult.count} archived products`
	);

	console.log("[CRON:hard-delete-retention] Retention cleanup completed");

	return {
		productsDeleted: productsResult.count,
		reviewsDeleted: reviewsResult.count,
		newsletterDeleted: newsletterResult.count,
		stockNotificationsDeleted: stockNotificationsResult.count,
		customizationRequestsDeleted: customizationRequestsResult.count,
		wishlistsDeleted: wishlistsResult.count,
	};
}
