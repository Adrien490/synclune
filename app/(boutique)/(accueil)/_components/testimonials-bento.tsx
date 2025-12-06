import { Fade } from "@/shared/components/animations"
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config"
import { cn } from "@/shared/utils/cn"
import { TestimonialCard } from "@/modules/testimonials/components/testimonial-card"
import type { TestimonialDisplay } from "@/modules/testimonials/types/testimonial.types"

interface TestimonialsBentoProps {
	testimonials: TestimonialDisplay[]
	className?: string
}

/**
 * Grille de témoignages - Layout Bento Asymétrique
 *
 * Design optimisé pour e-commerce bijoux :
 * - Desktop : 2 colonnes (2/3 + 1/3), featured à gauche avec row-span-2
 * - Tablette : featured en haut, secondaires côte à côte
 * - Mobile : empilé verticalement
 *
 * Le témoignage le plus récent est automatiquement featured
 */
export function TestimonialsBento({
	testimonials,
	className,
}: TestimonialsBentoProps) {
	if (testimonials.length === 0) {
		return null
	}

	const slideY = MOTION_CONFIG.transform.slideDistance

	// Max 3 témoignages pour garder l'impact visuel
	const displayedTestimonials = testimonials.slice(0, 3)

	// Le premier (plus récent) est le featured
	const [featured, ...secondary] = displayedTestimonials

	// Si un seul témoignage, affichage simple centré
	if (displayedTestimonials.length === 1) {
		return (
			<div
				role="region"
				aria-label="1 témoignage client"
				className={cn("max-w-2xl mx-auto", className)}
			>
				<Fade y={slideY} duration={0.6} once inView>
					<TestimonialCard testimonial={featured} variant="featured" />
				</Fade>
			</div>
		)
	}

	// Si 2 témoignages, layout simplifié
	if (displayedTestimonials.length === 2) {
		return (
			<div
				role="region"
				aria-label="2 témoignages clients"
				className={cn(
					"grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6",
					className
				)}
			>
				<Fade y={slideY} duration={0.6} once inView>
					<TestimonialCard testimonial={featured} variant="featured" />
				</Fade>
				<Fade y={slideY} delay={0.15} duration={0.4} once inView>
					<TestimonialCard testimonial={secondary[0]} variant="compact" />
				</Fade>
			</div>
		)
	}

	// 3 témoignages : layout bento asymétrique
	return (
		<div
			role="region"
			aria-label="3 témoignages clients"
			className={cn(
				"grid gap-4 sm:gap-5 lg:gap-6",
				// Mobile : 1 colonne
				"grid-cols-1",
				// Desktop : 2 colonnes (2fr + 1fr)
				"lg:grid-cols-[2fr_1fr]",
				className
			)}
		>
			{/* Featured - prend 2 lignes sur desktop */}
			<Fade
				y={slideY}
				duration={0.6}
				once
				inView
				className="lg:row-span-2"
			>
				<TestimonialCard
					testimonial={featured}
					variant="featured"
					className="h-full"
				/>
			</Fade>

			{/* Témoignages secondaires */}
			{secondary.map((testimonial, index) => (
				<Fade
					key={testimonial.id}
					y={slideY}
					delay={0.15 + index * 0.1}
					duration={0.4}
					once
					inView
				>
					<TestimonialCard testimonial={testimonial} variant="compact" />
				</Fade>
			))}
		</div>
	)
}
