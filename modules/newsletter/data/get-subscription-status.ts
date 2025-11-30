import { cacheLife, cacheTag } from "next/cache";
import { getCurrentUser } from "@/modules/users/data/get-current-user";
import { prisma } from "@/shared/lib/prisma";

import { GET_NEWSLETTER_STATUS_DEFAULT_SELECT } from "../constants/subscriber.constants";
import type { GetSubscriptionStatusReturn } from "../types/subscriber.types";

// Re-export pour compatibilité
export { GET_NEWSLETTER_STATUS_DEFAULT_SELECT } from "../constants/subscriber.constants";
export type { GetSubscriptionStatusReturn } from "../types/subscriber.types";

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Récupère le statut d'abonnement newsletter de l'utilisateur actuel
 *
 * @returns Le statut d'abonnement newsletter de l'utilisateur
 */
export async function getSubscriptionStatus(): Promise<GetSubscriptionStatusReturn> {
	const user = await getCurrentUser();

	if (!user?.email) {
		return {
			isSubscribed: false,
			email: null,
			emailVerified: false,
		};
	}

	const subscriber = await fetchSubscriptionStatus(user.email, user.id);

	return {
		isSubscribed: subscriber?.status === "CONFIRMED",
		email: user.email,
		emailVerified: subscriber?.status === "CONFIRMED",
	};
}

/**
 * Récupère le statut d'abonnement newsletter depuis la DB avec cache
 *
 * @param email - Email de l'utilisateur
 * @param userId - ID de l'utilisateur pour le tag de cache
 * @returns Le statut d'abonnement ou null si non trouvé
 */
export async function fetchSubscriptionStatus(
	email: string,
	userId: string
): Promise<{ status: string } | null> {
	"use cache: private";
	// Cache configuration: 5min stale, revalidate après 1min, expire après 1h
	cacheLife({ stale: 300, revalidate: 60, expire: 3600 });
	cacheTag(`newsletter-user-${userId}`);

	try {
		const subscriber = await prisma.newsletterSubscriber.findUnique({
			where: { email },
			select: GET_NEWSLETTER_STATUS_DEFAULT_SELECT,
		});

		return subscriber;
	} catch (error) {
		// Logging structuré pour debug production
		console.error("[GET_SUBSCRIPTION_STATUS]", {
			email: email.substring(0, 3) + "***", // Masquer partiellement l'email
			userId,
			error: error instanceof Error ? error.message : "Unknown error",
		});
		return null;
	}
}
