import { use } from "react"
import Link from "next/link"

import { Fade, Stagger } from "@/shared/components/animations"
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config"
import { Button } from "@/shared/components/ui/button"
import { SectionTitle } from "@/shared/components/section-title"
import { RatingStars } from "@/shared/components/rating-stars"
import { SECTION_SPACING } from "@/shared/constants/spacing"
import { formatRating } from "@/shared/utils/rating-utils"
import { HomepageReviewCard } from "@/modules/reviews/components/homepage-review-card"

import type { ReviewHomepage } from "@/modules/reviews/types/review.types"
import type { GlobalReviewStats } from "@/modules/reviews/types/review.types"

interface ReviewsSectionProps {
	reviewsPromise: Promise<ReviewHomepage[]>
	reviewStatsPromise: Promise<GlobalReviewStats>
}

/**
 * Homepage social proof section — displays 6 featured customer reviews
 * with aggregate rating header. Gracefully returns null if no reviews.
 *
 * Accepts promises for streaming with React Suspense.
 */
export function ReviewsSection({
	reviewsPromise,
	reviewStatsPromise,
}: ReviewsSectionProps) {
	const reviews = use(reviewsPromise)
	const stats = use(reviewStatsPromise)

	if (reviews.length === 0) {
		return null
	}

	return (
		<section
			id="reviews"
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-labelledby="reviews-title"
			aria-describedby="reviews-subtitle"
		>
			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="reviews-title">
							Ce que disent nos clientes
						</SectionTitle>
					</Fade>
					<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
						<p
							id="reviews-subtitle"
							className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
						>
							Des créations uniques, portées et approuvées par notre communauté
						</p>
					</Fade>

					{/* Aggregate rating */}
					{stats.totalReviews > 0 && (
						<Fade y={10} delay={0.2} duration={0.6}>
							<div className="mt-4 flex items-center justify-center gap-2">
								<RatingStars rating={stats.averageRating} size="sm" />
								<span className="text-sm font-medium text-foreground">
									{formatRating(stats.averageRating)}
								</span>
								<span className="text-sm text-muted-foreground">
									({stats.totalReviews} avis)
								</span>
							</div>
						</Fade>
					)}
				</header>

				{/* Reviews grid */}
				<Stagger
					className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 lg:mb-12"
					stagger={MOTION_CONFIG.section.grid.stagger}
					y={MOTION_CONFIG.section.grid.y}
					inView
					once={true}
				>
					{reviews.map((review) => (
						<HomepageReviewCard key={review.id} review={review} />
					))}
				</Stagger>

				{/* CTA */}
				<Fade
					y={MOTION_CONFIG.section.cta.y}
					delay={MOTION_CONFIG.section.cta.delay}
					duration={MOTION_CONFIG.section.cta.duration}
					inView
					once
					className="text-center"
				>
					<Button
						asChild
						size="lg"
						variant="outline"
						className="hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
					>
						<Link href="/produits">
							Découvrir nos créations
						</Link>
					</Button>
				</Fade>
			</div>
		</section>
	)
}
