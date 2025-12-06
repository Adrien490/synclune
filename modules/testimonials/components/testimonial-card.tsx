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

/** Placeholder blur générique pour avatars */
const AVATAR_BLUR_PLACEHOLDER =
	"data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMCwsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAAoACgDASIAAhEBAxEB/8QAGQAAAwEBAQAAAAAAAAAAAAAAAAUGBwQI/8QAKhAAAgEDAwMDBAMBAAAAAAAAAQIDBAURAAYhEjFBE1FhByJxgRQjkdH/xAAYAQADAQEAAAAAAAAAAAAAAAACAwQFAP/EAB4RAAICAgIDAAAAAAAAAAAAAAECAAMEERIhMUFR/9oADAMBAAIRAxEAPwDqt1FJVVEcES5eRgoHualds2m+XaOWG3W+orDGQH9CLqC/J8DVH9Ort9u7jLe6+NqWkiP9EUg+6Q+7Y7DH+68e+tC2vvSmsm3Y7Xb7NSUNQzySTNGmZJCx8sc+B2AxjUuRmNjkKo2JrYuGbV/JkN0+l26amJY2oRG45EkLdBH58HVBQbev9ijeLbt2ekjlOXEKj7j78EHOryW40U4H8mqhlHhlmU/7rru9fBZLPV3KpbpgpYXmkP4UZP8AuuTLtPQPcKMLhMesyzqO2d7UMaSVVnrOlQBmOEyDH7XOPnXL/boPw6/xNOdm/UPb+4rLTV9rnaWiqE64Xwcg8gqfBBBBHyNGvFLVHU3YftJPeadUP9Sfbw5cPRXq2iCloKh6jckDNGJBJDAH+4+cK5P28+2l+89wR3e5rTUUgltdAzRU7A8Ssc9Ug9+cD8DRo0s2qBMo4VduJz1Dln6JWZQSDnGCQDjjnRo0aBuTPZ//9k="

/**
 * Carte de témoignage - Server Component
 *
 * 2 variants :
 * - "featured" : Grande carte avec avatar 56px, texte lg, gradient subtil
 * - "default" : Carte compacte avec avatar 40px
 *
 * Animations hover CSS-only pour performance optimale.
 * Sémantique figure/figcaption pour accessibilité.
 */
export function TestimonialCard({
	testimonial,
	variant = "default",
	className,
}: TestimonialCardProps) {
	const isFeatured = variant === "featured"

	return (
		<Card
			tabIndex={0}
			className={cn(
				"group h-full border-0 backdrop-blur-sm",
				"transition-all duration-500 ease-in-out",
				"hover:scale-[1.01] hover:shadow-lg",
				"focus-visible:scale-[1.01] focus-visible:shadow-lg",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
				"active:scale-[0.98]",
				isFeatured
					? "bg-gradient-to-br from-primary/5 via-card/50 to-card/50 hover:from-primary/10 border-l-4 border-l-primary"
					: "bg-card/50 hover:bg-card/70",
				className
			)}
		>
			<CardContent
				className={cn(
					"flex flex-col h-full",
					isFeatured ? "p-5 sm:p-6 lg:p-8" : "p-4 sm:p-5"
				)}
			>
				<figure className="flex flex-col h-full">
					<Quote
						aria-hidden="true"
						className={cn(
							"shrink-0 text-primary/30",
							"transition-all duration-500 ease-in-out",
							"group-hover:text-primary/50 group-hover:scale-105",
							isFeatured
								? "h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10 mb-4 sm:mb-5 lg:mb-6"
								: "h-6 w-6 sm:h-7 sm:w-7 mb-3 sm:mb-4"
						)}
					/>

					<blockquote
						className={cn(
							"flex-1 leading-relaxed text-muted-foreground italic",
							isFeatured
								? "text-base sm:text-lg mb-5 sm:mb-6 lg:mb-8 line-clamp-5 sm:line-clamp-6"
								: "text-sm sm:text-base mb-4 sm:mb-5 line-clamp-4"
						)}
					>
						&ldquo;{testimonial.content}&rdquo;
					</blockquote>

					<figcaption className="flex items-center gap-3 mt-auto">
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
									placeholder="blur"
									blurDataURL={AVATAR_BLUR_PLACEHOLDER}
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
										isFeatured ? "text-lg" : "text-base"
									)}
								>
									{testimonial.authorName.charAt(0).toUpperCase()}
								</span>
							</div>
						)}
						<span
							className={cn(
								"font-medium text-foreground",
								isFeatured && "text-lg"
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
