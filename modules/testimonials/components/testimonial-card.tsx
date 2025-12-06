import Image from "next/image"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/utils/cn"
import type { TestimonialDisplay } from "../types/testimonial.types"

type TestimonialCardVariant = "featured" | "compact"

interface TestimonialCardProps {
	testimonial: TestimonialDisplay
	variant?: TestimonialCardVariant
	className?: string
}

/** Placeholder blur pour les photos de bijoux portés */
const IMAGE_BLUR_PLACEHOLDER =
	"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAoACgDASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAAUGBwQI/8QAKhAAAgEDAwMDBAMBAAAAAAAAAQIDBAURAAYhEjFBE1FhByJxgRQjkdH/xAAYAQADAQEAAAAAAAAAAAAAAAACAwQFAP/EAB4RAAICAgIDAAAAAAAAAAAAAAECAAMEERIhMUFR/9oADAMBAAIRAxEAPwDqt1FJVVEcES5eRgoHualds2m+XaOWG3W+orDGQH9CLqC/J8DVH9Ort9u7jLe6+NqWkiP9EUg+6Q+7Y7DH+68e+tC2vvSmsm3Y7Xb7NSUNQzySTNGmZJCx8sc+B2AxjUuRmNjkKo2JrYuGbV/JkN0+l26amJY2oRG45EkLdBH58HVBQbev9ijeLbt2ekjlOXEKj7j78EHOryW40U4H8mqhlHhlmU/7rru9fBZLPV3KpbpgpYXmkP4UZP8AuuTLtPQPcKMLhMesyzqO2d7UMaSVVnrOlQBmOEyDH7XOPnXL/boPw6/xNOdm/UPb+4rLTV9rnaWiqE64Xwcg8gqfBBBBHyNGvFLVHU3YftJPeadUP9Sfbw5cPRXq2iCloKh6jckDNGJBJDAH+4+cK5P28+2l+89wR3e5rTUUgltdAzRU7A8Ssc9Ug9+cD8DRo0s2qBMo4VduJz1Dln6JWZQSDnGCQDjjnRo0aBuTPZ//9k="

/**
 * Carte de témoignage avec image mise en avant
 *
 * Variantes :
 * - featured : Grande photo portrait, texte complet, pour le témoignage principal
 * - compact : Photo carrée, texte tronqué, pour les témoignages secondaires
 */
export function TestimonialCard({
	testimonial,
	variant = "compact",
	className,
}: TestimonialCardProps) {
	const isFeatured = variant === "featured"

	return (
		<Card
			className={cn(
				"group h-full overflow-hidden border-0 rounded-2xl",
				"bg-card/50 backdrop-blur-sm",
				"transition-all duration-500 ease-out",
				"hover:bg-card/70 hover:shadow-lg",
				className
			)}
		>
			{/* Photo de la cliente avec son bijou */}
			{testimonial.imageUrl && (
				<div
					className={cn(
						"relative w-full overflow-hidden bg-muted",
						isFeatured ? "aspect-[4/5]" : "aspect-square"
					)}
				>
					<Image
						src={testimonial.imageUrl}
						alt={`${testimonial.authorName} portant son bijou Synclune`}
						fill
						sizes={
							isFeatured
								? "(max-width: 768px) 100vw, 66vw"
								: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
						}
						className={cn(
							"object-cover",
							"transition-transform duration-700 ease-out",
							"group-hover:scale-105"
						)}
						placeholder="blur"
						blurDataURL={IMAGE_BLUR_PLACEHOLDER}
						priority={isFeatured}
					/>
				</div>
			)}

			<CardContent
				className={cn(
					isFeatured ? "p-5 sm:p-6 lg:p-8" : "p-4 sm:p-5"
				)}
			>
				<figure>
					{/* Témoignage */}
					<blockquote
						className={cn(
							"leading-relaxed text-muted-foreground",
							isFeatured
								? "text-base sm:text-lg"
								: "text-sm sm:text-base line-clamp-3"
						)}
					>
						"{testimonial.content}"
					</blockquote>

					{/* Signature */}
					<figcaption
						className={cn(
							"flex items-center gap-2",
							isFeatured ? "mt-4 sm:mt-5" : "mt-3"
						)}
					>
						<span className="h-px flex-1 bg-border/50" aria-hidden="true" />
						<span
							className={cn(
								"font-medium text-foreground",
								isFeatured ? "text-base" : "text-sm"
							)}
						>
							{testimonial.authorName}
						</span>
					</figcaption>
				</figure>
			</CardContent>
		</Card>
	)
}
