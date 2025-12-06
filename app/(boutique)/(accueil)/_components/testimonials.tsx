import { Fade } from "@/shared/components/animations"
import { SectionTitle } from "@/shared/components/ui/section-title"
import { SECTION_SPACING } from "@/shared/constants/spacing"
import { use } from "react"
import { TestimonialsBento } from "./testimonials-bento"
import type { TestimonialDisplay } from "../../../../modules/testimonials/types/testimonial.types"

interface TestimonialsProps {
	/** Promise contenant les témoignages */
	testimonialsPromise: Promise<TestimonialDisplay[]>
}

/**
 * Section Témoignages - Affiche les avis clients
 *
 * Pattern : Server Component qui accepte une Promise pour le streaming
 * Permet le rendu progressif avec React Suspense
 *
 * Retourne null si aucun témoignage n'est disponible
 * (la section disparaît complètement de la page)
 *
 * @param testimonialsPromise - Promise contenant les témoignages publiés
 *
 * @example
 * ```tsx
 * // Dans une page Server Component
 * import { getTestimonials } from "@/modules/testimonials/data/get-testimonials";
 *
 * export default function HomePage() {
 *   const testimonialsPromise = getTestimonials();
 *   return (
 *     <Suspense fallback={<TestimonialsSkeleton />}>
 *       <TestimonialsSection testimonialsPromise={testimonialsPromise} />
 *     </Suspense>
 *   );
 * }
 * ```
 */
export function TestimonialsSection({
	testimonialsPromise,
}: TestimonialsProps) {
	const testimonials = use(testimonialsPromise)

	// Si aucun témoignage, ne pas afficher la section
	if (testimonials.length === 0) {
		return null
	}

	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
			aria-labelledby="testimonials-title"
			aria-describedby="testimonials-subtitle"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="testimonials-title">
							Quelques retours
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="testimonials-subtitle"
							className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
						>
							Voici ce qu'ils disent de leur bijou !
						</p>
					</Fade>
				</header>

				<TestimonialsBento testimonials={testimonials} />
			</div>
		</section>
	)
}
