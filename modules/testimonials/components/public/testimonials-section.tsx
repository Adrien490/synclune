import { Suspense } from "react"
import { getTestimonials } from "../../data/get-testimonials"
import { TestimonialsCarousel } from "./testimonials-carousel"
import { TestimonialsSkeleton } from "./testimonials-skeleton"

interface TestimonialsSectionProps {
	/** Titre de la section */
	title?: string
	/** Sous-titre de la section */
	subtitle?: string
	/** Classes CSS additionnelles */
	className?: string
}

async function TestimonialsContent() {
	const testimonials = await getTestimonials()

	if (testimonials.length === 0) {
		return null
	}

	return <TestimonialsCarousel testimonials={testimonials} />
}

export function TestimonialsSection({
	title = "Ce que disent nos clientes",
	subtitle = "Des bijoux uniques, des clientes satisfaites",
	className,
}: TestimonialsSectionProps) {
	return (
		<section className={className}>
			<div className="container">
				<div className="text-center mb-10">
					<h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
						{title}
					</h2>
					{subtitle && (
						<p className="text-muted-foreground max-w-2xl mx-auto">
							{subtitle}
						</p>
					)}
				</div>

				<div className="px-4 lg:px-16">
					<Suspense fallback={<TestimonialsSkeleton />}>
						<TestimonialsContent />
					</Suspense>
				</div>
			</div>
		</section>
	)
}
