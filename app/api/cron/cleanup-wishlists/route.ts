import { prisma } from "@/shared/lib/prisma";
import { WISHLIST_TOTAL_LIFETIME_DAYS } from "@/modules/wishlist/constants/expiration.constants";
import { NextResponse } from "next/server";

/**
 * Cron job pour nettoyer les wishlists invité expirées
 *
 * Exécuté quotidiennement à 4h00 UTC (après le cleanup des paniers à 2h00)
 * Supprime les wishlists invité dont l'expiration est dépassée
 *
 * Stratégie :
 * - Supprimer les wishlists avec sessionId non null ET expiresAt < maintenant
 * - Conserver les wishlists utilisateur (userId non null)
 * - Grace period incluse dans expiresAt lors de la création
 */
export async function GET(request: Request) {
	// Vérifier l'autorisation (CRON_SECRET)
	const authHeader = request.headers.get("authorization");
	const cronSecret = process.env.CRON_SECRET;

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return NextResponse.json(
			{ error: "Unauthorized" },
			{ status: 401 }
		);
	}

	try {
		const now = new Date();

		// Supprimer les wishlists invité expirées
		// Les wishlists utilisateur (avec userId) n'ont pas d'expiresAt
		const result = await prisma.wishlist.deleteMany({
			where: {
				sessionId: { not: null }, // Uniquement les wishlists invité
				expiresAt: { lt: now }, // Expirées
			},
		});

		return NextResponse.json({
			success: true,
			message: `${result.count} wishlist${result.count > 1 ? "s" : ""} invité supprimée${result.count > 1 ? "s" : ""}`,
			data: {
				deletedCount: result.count,
				timestamp: now.toISOString(),
				retentionDays: WISHLIST_TOTAL_LIFETIME_DAYS,
			},
		});
	} catch (error) {
		console.error("[CRON] cleanup-wishlists error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
