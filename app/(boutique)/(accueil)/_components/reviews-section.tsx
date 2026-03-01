import { use } from "react";
import Link from "next/link";

import { Fade, HandDrawnUnderline, Reveal, Stagger } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Button } from "@/shared/components/ui/button";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
	CarouselItem,
} from "@/shared/components/ui/carousel";
import { SectionTitle } from "@/shared/components/section-title";
import { RatingStars } from "@/shared/components/rating-stars";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { formatRating } from "@/shared/utils/rating-utils";
import { HomepageReviewCard } from "@/modules/reviews/components/homepage-review-card";

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
			className={`bg-background relative overflow-hidden ${SECTION_SPACING.section}`}
			aria-labelledby="reviews-title"
			aria-describedby="reviews-subtitle"
		>
			{/* Skip link for keyboard navigation - skip carousel */}
			<a
				href="#reviews-cta"
				className="focus:bg-background focus:ring-ring focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2"
			>
				Passer le carrousel d&apos;avis
			</a>

			<div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="reviews-title">Ce que disent nos clientes</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
					>
						<p
							id="reviews-subtitle"
							className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal"
						>
							Des créations uniques, portées et approuvées par notre communauté
						</p>
					</Fade>

					{/* Aggregate rating */}
					{stats.totalReviews > 0 && (
						<Fade
							y={MOTION_CONFIG.section.subtitle.y}
							delay={MOTION_CONFIG.section.subtitle.delay}
							duration={MOTION_CONFIG.section.subtitle.duration}
						>
							<div className="mt-4 flex items-center justify-center gap-2">
								<RatingStars rating={stats.averageRating} size="sm" />
								<span className="text-foreground text-sm font-medium" aria-hidden="true">
									{formatRating(stats.averageRating)}
								</span>
								<span className="text-muted-foreground text-sm" aria-hidden="true">
									({stats.totalReviews} avis)
								</span>
							</div>
						</Fade>
					)}
				</header>

				{/* Mobile: carousel */}
				<div className="mb-6 sm:mb-8 lg:hidden">
					<Reveal
						y={MOTION_CONFIG.section.carousel.y}
						delay={MOTION_CONFIG.section.carousel.delay}
						duration={MOTION_CONFIG.section.carousel.duration}
						once
					>
						<Carousel
							opts={{
								align: "center",
								containScroll: "trimSnaps",
							}}
							className="w-full"
							aria-label={`Carrousel de ${reviews.length} avis clients`}
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
				<div id="reviews-cta">
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
							className="transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
						>
							<Link href="/produits?sortBy=rating-descending">
								Voir les créations les mieux notées
							</Link>
						</Button>
					</Fade>
				</div>
			</div>
		</section>
	);
}
