import Image from "next/image"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/cn"
import { Quote } from "lucide-react"
import type { TestimonialDisplay } from "../types/testimonial.types"

type TestimonialCardVariant = "default" | "featured"

interface TestimonialCardProps {
	testimonial: TestimonialDisplay
	variant?: TestimonialCardVariant
	className?: string
}

/**
 * Carte de témoignage - Server Component
 *
 * 2 variants :
 * - "featured" : Grande carte avec avatar 56px, texte lg, gradient subtil
 * - "default" : Carte compacte avec avatar 40px
 *
 * Animations hover CSS-only pour performance optimale.
 */
export function TestimonialCard({
	testimonial,
	variant = "default",
	className,
}: TestimonialCardProps) {
	const isFeatured = variant === "featured"

	return (
		<Card
			className={cn(
				"group h-full border-0 backdrop-blur-sm",
				"transition-all duration-300 ease-out",
				"hover:scale-[1.02] hover:shadow-lg",
				isFeatured
					? "bg-gradient-to-br from-primary/5 via-card/50 to-card/50 hover:from-primary/10 border-l-4 border-l-primary lg:border-l-0"
					: "bg-card/50 hover:bg-card/70",
				className
			)}
		>
			<CardContent
				className={cn(
					"flex flex-col h-full",
					isFeatured ? "p-8" : "p-5"
				)}
			>
				<Quote
					aria-hidden="true"
					className={cn(
						"shrink-0 text-primary/30",
						"transition-all duration-300 ease-out",
						"group-hover:text-primary/50 group-hover:scale-110 group-hover:rotate-6",
						isFeatured ? "h-10 w-10 mb-6" : "h-7 w-7 mb-4"
					)}
				/>

				<blockquote
					className={cn(
						"flex-1 leading-relaxed text-muted-foreground italic",
						isFeatured ? "text-lg mb-8" : "text-base mb-5"
					)}
				>
					&ldquo;{testimonial.content}&rdquo;
				</blockquote>

				<div className="flex items-center gap-3 mt-auto">
					{testimonial.imageUrl ? (
						<div
							className={cn(
								"relative shrink-0 rounded-full overflow-hidden bg-muted",
								isFeatured ? "h-14 w-14" : "h-10 w-10"
							)}
						>
							<Image
								src={testimonial.imageUrl}
								alt={`Photo de ${testimonial.authorName}`}
								fill
								sizes={isFeatured ? "56px" : "40px"}
								className="object-cover"
							/>
						</div>
					) : (
						<div
							className={cn(
								"shrink-0 rounded-full bg-primary/10 flex items-center justify-center",
								isFeatured ? "h-14 w-14" : "h-10 w-10"
							)}
						>
							<span
								className={cn(
									"text-primary font-semibold",
									isFeatured ? "text-lg" : "text-sm"
								)}
							>
								{testimonial.authorName.charAt(0).toUpperCase()}
							</span>
						</div>
					)}
					<p
						className={cn(
							"font-medium text-foreground",
							isFeatured && "text-lg"
						)}
					>
						{testimonial.authorName}
					</p>
				</div>
			</CardContent>
		</Card>
	)
}
