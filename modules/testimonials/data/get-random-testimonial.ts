import { connection } from "next/server"
import { getDailyIndex } from "@/shared/utils/dates"
import type { TestimonialDisplay } from "../types/testimonial.types"
import { getTestimonials } from "./get-testimonials"

/**
 * Récupère un témoignage "aléatoire" parmi les témoignages publiés
 *
 * Utilise une seed basée sur le jour pour être compatible avec le cache Next.js.
 * Le témoignage affiché change chaque jour à minuit UTC.
 * Le cache est géré par getTestimonials() (profile "reference").
 *
 * @returns Un témoignage ou null si aucun témoignage publié
 */
export async function getRandomTestimonial(): Promise<TestimonialDisplay | null> {
	await connection()
	const testimonials = await getTestimonials()

	if (testimonials.length === 0) {
		return null
	}

	const index = getDailyIndex(testimonials.length)
	return testimonials[index] ?? null
}
