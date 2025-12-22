import type { TestimonialDisplay } from "../types/testimonial.types"
import { getTestimonials } from "./get-testimonials"

/**
 * Récupère un témoignage aléatoire parmi les témoignages publiés
 * Utilise getTestimonials() (cachée) puis sélectionne aléatoirement
 *
 * @returns Un témoignage aléatoire ou null si aucun témoignage publié
 */
export async function getRandomTestimonial(): Promise<TestimonialDisplay | null> {
	const testimonials = await getTestimonials()

	if (testimonials.length === 0) {
		return null
	}

	const randomIndex = Math.floor(Math.random() * testimonials.length)
	return testimonials[randomIndex] ?? null
}
