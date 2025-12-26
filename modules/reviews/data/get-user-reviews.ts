import { cacheLife, cacheTag } from "next/cache";

import { prisma, notDeleted } from "@/shared/lib/prisma";
import { getSession } from "@/modules/auth/lib/get-current-session";

import { REVIEWS_CACHE_TAGS } from "../constants/cache";
import { REVIEW_USER_SELECT } from "../constants/review.constants";
import type { ReviewUser } from "../types/review.types";

/**
 * Recupere les avis de l'utilisateur connecte
 * Pour l'espace client "Mes avis"
 *
 * Pattern wrapper: la fonction publique recupere la session (cookies)
 * puis delegue a une fonction interne avec cache
 */
export async function getUserReviews(): Promise<ReviewUser[]> {
	const session = await getSession();
	if (!session?.user?.id) {
		return [];
	}

	return fetchUserReviews(session.user.id);
}

/**
 * Fonction interne avec cache
 * Separee pour eviter l'incompatibilite cookies/headers avec "use cache"
 */
async function fetchUserReviews(userId: string): Promise<ReviewUser[]> {
	"use cache";
	cacheLife("session");
	cacheTag(REVIEWS_CACHE_TAGS.USER(userId));

	const reviews = await prisma.productReview.findMany({
		where: {
			userId,
			...notDeleted,
		},
		select: REVIEW_USER_SELECT,
		orderBy: { createdAt: "desc" },
	});

	return reviews as unknown as ReviewUser[];
}
