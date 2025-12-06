import { prisma, notDeleted } from "@/shared/lib/prisma"
import type { TestimonialRecord } from "../types/testimonial.types"

/**
 * Récupère un témoignage par son ID
 * Utilisé pour l'édition dans l'admin
 */
export async function getTestimonialById(
	id: string
): Promise<TestimonialRecord | null> {
	return prisma.testimonial.findFirst({
		where: {
			id,
			...notDeleted,
		},
	})
}
