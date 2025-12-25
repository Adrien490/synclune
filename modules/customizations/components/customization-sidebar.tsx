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
		<aside className={cn("sticky top-24", className)}>
			<TestimonialCard testimonial={testimonial} />
		</aside>
	)
}
