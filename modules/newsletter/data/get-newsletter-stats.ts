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

	const [totalSubscribers, activeSubscribers] = await Promise.all([
		prisma.newsletterSubscriber.count(),
		prisma.newsletterSubscriber.count({
			where: {
				status: NewsletterStatus.CONFIRMED,
			},
		}),
	]);

	return {
		totalSubscribers,
		activeSubscribers,
		inactiveSubscribers: totalSubscribers - activeSubscribers,
	};
}
