import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/cn"
import { Quote } from "lucide-react"
import type { TestimonialDisplay } from "../../types/testimonial.types"

interface TestimonialCardProps {
	testimonial: TestimonialDisplay
	className?: string
}

export function TestimonialCard({ testimonial, className }: TestimonialCardProps) {
	return (
		<Card
			className={cn(
				"h-full border-0 bg-card/50 backdrop-blur-sm",
				className
			)}
		>
			<CardContent className="p-6 flex flex-col h-full">
				<Quote className="h-8 w-8 text-primary/30 mb-4 shrink-0" />

				<blockquote className="flex-1 text-base leading-relaxed text-muted-foreground italic mb-6">
					"{testimonial.content}"
				</blockquote>

				<div className="flex items-center gap-3 mt-auto">
					{testimonial.imageUrl ? (
						<div className="shrink-0 h-10 w-10 rounded-full overflow-hidden bg-muted">
							<img
								src={testimonial.imageUrl}
								alt={`Photo de ${testimonial.authorName}`}
								className="h-full w-full object-cover"
								loading="lazy"
							/>
						</div>
					) : (
						<div className="shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
							<span className="text-primary font-semibold text-sm">
								{testimonial.authorName.charAt(0).toUpperCase()}
							</span>
						</div>
					)}
					<p className="font-medium text-foreground">
						{testimonial.authorName}
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
