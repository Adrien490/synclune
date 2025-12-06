"use cache"

import { prisma, notDeleted } from "@/shared/lib/prisma"
import { cacheTestimonialsAdmin } from "../constants/cache"

/**
 * Statistiques des témoignages
 */
export interface TestimonialsStats {
	/** Nombre total de témoignages (hors supprimés) */
	totalCount: number
	/** Nombre de témoignages publiés */
	publishedCount: number
	/** Nombre de témoignages en brouillon */
	draftCount: number
}

/**
 * Récupère les statistiques des témoignages pour le dashboard admin
 */
export async function getTestimonialsStats(): Promise<TestimonialsStats> {
	cacheTestimonialsAdmin()

	const [totalCount, publishedCount] = await Promise.all([
		prisma.testimonial.count({
			where: notDeleted,
		}),
		prisma.testimonial.count({
			where: {
				isPublished: true,
				...notDeleted,
			},
		}),
	])

	return {
		totalCount,
		publishedCount,
		draftCount: totalCount - publishedCount,
	}
}
