import { use } from "react";

import { Fade, HandDrawnAccent, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
	CarouselItem,
} from "@/shared/components/ui/carousel";
import { SkipLink } from "@/shared/components/skip-link";
import { RatingStars } from "@/shared/components/rating-stars";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { cn } from "@/shared/utils/cn";
import { formatRating, formatReviewCount } from "@/shared/utils/rating-utils";
import { HomepageReviewCard } from "@/modules/reviews/components/homepage-review-card";
import { pickPullQuote } from "./pick-pull-quote";
import { ReviewsPullQuote } from "./reviews-pull-quote";
import { SectionCtaLink } from "./section-cta-link";
import { SectionDivider } from "./section-divider";
import { SectionHalo } from "./section-halo";
import { SectionHeader } from "./section-header";

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

	const pullQuote = pickPullQuote(reviews);

	return (
		<section
			id="reviews"
			data-accent="mint"
			className={cn("bg-background relative overflow-hidden", SECTION_SPACING.section)}
			aria-labelledby="reviews-title"
			aria-describedby="reviews-subtitle"
		>
			{/* Skip link for keyboard navigation - skip carousel */}
			<SkipLink targetId="reviews-cta" label="Aller au lien Découvrir toutes les créations" />
			<SectionHalo position="bottom-left" />

			<div className={`relative ${CONTAINER_CLASS}`}>
				<SectionDivider />
				{/* Header — cœur dessiné en rose signature (le cœur = marque, l'underline
				    reste menthe : contraste bicolore voulu) */}
				<SectionHeader
					titleId="reviews-title"
					subtitleId="reviews-subtitle"
					title={
						<span className="relative inline-block">
							Ce que dit notre clientèle
							<HandDrawnAccent
								variant="heart"
								width={26}
								height={26}
								color="var(--primary)"
								className="absolute -top-4 -right-7 sm:-top-5 sm:-right-9"
							/>
						</span>
					}
					subtitle="Des créations uniques, plébiscitées par notre communauté"
				>
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
				</SectionHeader>

				{/* Pull-quote — meilleure citation en exergue Sacramento (si un avis 5★ citable existe) */}
				{pullQuote && <ReviewsPullQuote review={pullQuote} />}

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
						{/* Re-ciblé /produits : le rail « Les mieux notées » (juste au-dessus)
						    possède déjà le CTA vers le tri par note — éviter le doublon. */}
						<SectionCtaLink
							href="/produits"
							variant="link"
							aria-describedby="reviews-cta-description"
						>
							Découvrir toutes les créations
						</SectionCtaLink>
						<span id="reviews-cta-description" className="sr-only">
							Parcourir tout le catalogue des créations Synclune
						</span>
					</Fade>
				</div>
			</div>
		</section>
	);
}
