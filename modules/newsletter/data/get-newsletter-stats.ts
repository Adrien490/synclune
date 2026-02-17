import { cacheLife, cacheTag } from "next/cache";
import { prisma } from "@/shared/lib/prisma";
import { NewsletterStatus } from "@/app/generated/prisma/client";
import { NEWSLETTER_CACHE_TAGS } from "../constants/cache";
import type { NewsletterStats } from "../types/subscriber.types";

// Re-export pour compatibilité
export type { NewsletterStats };

/**
 * Récupère les statistiques de la newsletter pour le dashboard admin
 *
 * @returns Statistiques des abonnés (total, actifs, inactifs)
 */
export async function getNewsletterStats(): Promise<NewsletterStats> {
	"use cache";
	cacheLife("dashboard");
	cacheTag(NEWSLETTER_CACHE_TAGS.LIST);

	try {
		const [totalSubscribers, activeSubscribers] = await Promise.all([
			prisma.newsletterSubscriber.count({
				where: { deletedAt: null },
			}),
			prisma.newsletterSubscriber.count({
				where: {
					status: NewsletterStatus.CONFIRMED,
					deletedAt: null,
				},
			}),
		]);

		return {
			totalSubscribers,
			activeSubscribers,
			inactiveSubscribers: totalSubscribers - activeSubscribers,
		};
	} catch (error) {
		console.error("[GET_NEWSLETTER_STATS]", error);
		return {
			totalSubscribers: 0,
			activeSubscribers: 0,
			inactiveSubscribers: 0,
		};
	}
}
