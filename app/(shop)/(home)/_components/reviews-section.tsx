import { use } from "react";

import { Fade, HandDrawnUnderline, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
	CarouselItem,
} from "@/shared/components/ui/carousel";
import { SectionTitle } from "@/shared/components/section-title";
import { SkipLink } from "@/shared/components/skip-link";
import { RatingStars } from "@/shared/components/rating-stars";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { formatRating, formatReviewCount } from "@/shared/utils/rating-utils";
import { HomepageReviewCard } from "@/modules/reviews/components/homepage-review-card";
import { SectionCtaLink } from "./section-cta-link";

import type { ReviewHomepage, GlobalReviewStats } from "@/modules/reviews/types/review.types";

interface ReviewsSectionProps {
	reviewsPromise: Promise<ReviewHomepage[]>;
	reviewStatsPromise: Promise<GlobalReviewStats>;
}

/**
 * Homepage social proof section — displays 6 featured customer reviews
 * with aggregate rating header. Gracefully returns null if no reviews.
 *
 * Accepts promises for streaming with React Suspense.
 */
export function ReviewsSection({ reviewsPromise, reviewStatsPromise }: ReviewsSectionProps) {
	const reviews = use(reviewsPromise);
	const stats = use(reviewStatsPromise);

	if (reviews.length === 0) {
		return null;
	}

	return (
		<section
			id="reviews"
			className={cn(
				"bg-primary/5 relative overflow-hidden",
				"mask-t-from-95% mask-t-to-100% mask-b-from-95% mask-b-to-100% sm:mask-t-from-90% sm:mask-b-from-90%",
				SECTION_SPACING.section,
			)}
			aria-labelledby="reviews-title"
			aria-describedby="reviews-subtitle"
		>
			{/* Skip link for keyboard navigation - skip carousel */}
			<SkipLink targetId="reviews-cta" label="Aller au lien Voir les créations les mieux notées" />

			<div className={`relative ${CONTAINER_CLASS}`}>
				{/* Header */}
				<header className="mb-10 text-center lg:mb-14">
					<Fade
						y={MOTION_CONFIG.section.title.y}
						duration={MOTION_CONFIG.section.title.duration}
						inView
						once
					>
						<SectionTitle id="reviews-title">Ce que dit notre clientèle</SectionTitle>
						<HandDrawnUnderline
							delay={MOTION_CONFIG.section.underline.delay}
							className="mx-auto mt-2"
						/>
					</Fade>
					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
						inView
						once
					>
						<p
							id="reviews-subtitle"
							className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal"
						>
							Des créations uniques, plébiscitées par notre communauté
						</p>
					</Fade>

					{/* Aggregate rating */}
					{stats.totalReviews > 0 && (
						<Fade
							y={MOTION_CONFIG.section.subtitle.y}
							delay={MOTION_CONFIG.section.subtitle.delay}
							duration={MOTION_CONFIG.section.subtitle.duration}
							inView
							once
						>
							<div className="mt-4 flex items-center justify-center gap-2">
								<span className="sr-only">
									Note moyenne : {formatRating(stats.averageRating)} sur 5, basée sur{" "}
									{formatReviewCount(stats.totalReviews)} avis.
								</span>
								<RatingStars rating={stats.averageRating} size="sm" />
								<span className="text-foreground text-sm font-medium" aria-hidden="true">
									{formatRating(stats.averageRating)}
								</span>
								<span className="text-muted-foreground text-sm" aria-hidden="true">
									({formatReviewCount(stats.totalReviews)} avis)
								</span>
							</div>
						</Fade>
					)}
				</header>

				{/* Mobile: carousel */}
				<div className="mb-8 sm:mb-10 lg:hidden">
					<Reveal
						y={MOTION_CONFIG.section.carousel.y}
						delay={MOTION_CONFIG.section.carousel.delay}
						duration={MOTION_CONFIG.section.carousel.duration}
						once
					>
						<Carousel
							opts={{
								align: "center",
								loop: true,
							}}
							className="w-full"
							aria-label={`${reviews.length} avis clients`}
						>
							<CarouselContent className="-ml-4 py-4" showFade>
								{reviews.map((review, index) => (
									<CarouselItem
										key={review.id}
										index={index}
										className="basis-[clamp(260px,80vw,340px)] pl-4"
									>
										<HomepageReviewCard review={review} />
									</CarouselItem>
								))}
							</CarouselContent>
							<CarouselDots />
						</Carousel>
					</Reveal>
				</div>

				{/* Desktop: grid */}
				<Stagger
					className="mb-6 hidden grid-cols-3 gap-6 sm:mb-8 lg:mb-12 lg:grid"
					stagger={MOTION_CONFIG.section.grid.stagger}
					y={MOTION_CONFIG.section.grid.y}
					inView
					once
				>
					{reviews.map((review) => (
						<HomepageReviewCard key={review.id} review={review} />
					))}
				</Stagger>

				{/* CTA */}
				<div
					id="reviews-cta"
					tabIndex={-1}
					className="focus-visible:ring-ring focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<Fade
						y={MOTION_CONFIG.section.cta.y}
						delay={MOTION_CONFIG.section.cta.delay}
						duration={MOTION_CONFIG.section.cta.duration}
						inView
						once
						className="text-center"
					>
						<SectionCtaLink
							href="/produits?sortBy=rating-descending"
							aria-describedby="reviews-cta-description"
						>
							Voir les créations les mieux notées
						</SectionCtaLink>
						<span id="reviews-cta-description" className="sr-only">
							Parcourir le catalogue trié par note moyenne décroissante
						</span>
					</Fade>
				</div>
			</div>
		</section>
	);
}
