import { TestimonialCard } from "@/modules/testimonials/components/testimonial-card"
import { cn } from "@/shared/utils/cn"

import type { TestimonialDisplay } from "@/modules/testimonials/types/testimonial.types"

interface CustomizationSidebarProps {
	testimonial: TestimonialDisplay | null
	className?: string
}

export function CustomizationSidebar({
	testimonial,
	className,
}: CustomizationSidebarProps) {
	// Si pas de témoignage, ne pas afficher la sidebar
	if (!testimonial) {
		return null
	}

	return (
		<aside className={cn("sticky top-24 space-y-6", className)}>
			{/* Titre de section */}
			<div className="space-y-2">
				<h2 className="font-display text-lg font-semibold text-foreground">
					Témoignages
				</h2>
				<p className="text-sm text-muted-foreground">
					Des créations uniques, des clients ravis
				</p>
			</div>

			{/* Témoignage */}
			<TestimonialCard testimonial={testimonial} />
		</aside>
	)
}
