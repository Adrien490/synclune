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
 * Bento Grid pour témoignages - Server Component
 *
 * Layout adaptatif selon le nombre de témoignages :
 * - 1 témoignage : pleine largeur
 * - 2 témoignages : 50/50 (6/12 + 6/12)
 * - 3 témoignages : 1 featured + 2 en ligne dessous
 * - 4+ témoignages : 1 featured (7/12) + stack de 3 (5/12)
 *
 * Zéro useState, animations CSS-only + Framer Motion inView
 */
export function TestimonialsBento({
	testimonials,
	className,
}: TestimonialsBentoProps) {
	if (testimonials.length === 0) {
		return null
	}

	const [featured, ...rest] = testimonials
	const slideY = MOTION_CONFIG.transform.slideDistance
	const staggerDelay = MOTION_CONFIG.stagger.slow

	// 1 témoignage → pleine largeur
	if (testimonials.length === 1) {
		return (
			<div
				role="region"
				aria-label="Témoignage client"
				className={className}
			>
				<Fade y={slideY} once inView>
					<TestimonialCard testimonial={featured} variant="featured" />
				</Fade>
			</div>
		)
	}

	// 2 témoignages → layout équilibré 50/50
	if (testimonials.length === 2) {
		return (
			<div
				role="region"
				aria-label="2 témoignages clients"
				className={cn(
					"grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 lg:gap-6",
					className
				)}
			>
				<Fade y={slideY} once inView>
					<TestimonialCard testimonial={featured} variant="featured" />
				</Fade>
				<Fade y={slideY} delay={staggerDelay} once inView>
					<TestimonialCard testimonial={rest[0]} variant="featured" />
				</Fade>
			</div>
		)
	}

	// 3 témoignages → 1 featured + 2 en ligne dessous
	if (testimonials.length === 3) {
		return (
			<div
				role="region"
				aria-label="3 témoignages clients"
				className={cn("flex flex-col gap-4 md:gap-5 lg:gap-6", className)}
			>
				<Fade y={slideY} once inView>
					<TestimonialCard testimonial={featured} variant="featured" />
				</Fade>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5 lg:gap-6">
					{rest.map((testimonial, index) => (
						<Fade
							key={testimonial.id}
							y={slideY}
							delay={staggerDelay * (index + 1)}
							once
							inView
						>
							<TestimonialCard testimonial={testimonial} variant="default" />
						</Fade>
					))}
				</div>
			</div>
		)
	}

	// 4+ témoignages → layout bento asymétrique (7/12 + 5/12)
	return (
		<div
			role="region"
			aria-label={`${Math.min(testimonials.length, 4)} témoignages clients`}
			className={cn(
				"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-5 lg:gap-6",
				className
			)}
		>
			{/* Featured - Grande carte à gauche, h-full pour occuper toute la hauteur du stack */}
			<div className="md:col-span-1 lg:col-span-7">
				<Fade y={slideY} once inView className="h-full">
					<TestimonialCard testimonial={featured} variant="featured" />
				</Fade>
			</div>

			{/* Stack - Cartes empilées à droite (max 3) */}
			<div className="md:col-span-1 lg:col-span-5 flex flex-col gap-4 md:gap-5 lg:gap-6">
				{rest.slice(0, 3).map((testimonial, index) => (
					<Fade
						key={testimonial.id}
						y={slideY}
						delay={staggerDelay * (index + 1)}
						once
						inView
					>
						<TestimonialCard testimonial={testimonial} variant="default" />
					</Fade>
				))}
			</div>
		</div>
	)
}
