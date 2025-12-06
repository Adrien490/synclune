import { prisma, notDeleted } from "@/shared/lib/prisma"
import { cacheTestimonials } from "../constants/cache"
import type { TestimonialDisplay } from "../types/testimonial.types"

/**
 * Récupère les témoignages publiés pour l'affichage storefront
 * Trié par date de création (plus récent en premier)
 */
export async function getTestimonials(): Promise<TestimonialDisplay[]> {
	"use cache"
	cacheTestimonials()

	return prisma.testimonial.findMany({
		where: {
			isPublished: true,
			...notDeleted,
		},
		select: {
			id: true,
			authorName: true,
			content: true,
			imageUrl: true,
		},
		orderBy: {
			createdAt: "desc",
		},
	})
}
