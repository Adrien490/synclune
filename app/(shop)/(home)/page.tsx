import { CollectionsSection } from "@/app/(shop)/(home)/_components/collections-section";
import { LatestCreations } from "@/app/(shop)/(home)/_components/latest-creations";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";

import { getProducts } from "@/modules/products/data/get-products";
import { getFeaturedReviews } from "@/modules/reviews/data/get-featured-reviews";
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import type { ReviewHomepage } from "@/modules/reviews/types/review.types";
import { ScrollToTop } from "@/shared/components/scroll-to-top";
import { StructuredData } from "@/shared/components/structured-data";
import { type GlobalReviewStats, SITE_URL } from "@/shared/constants/seo-config";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AtelierSection, AtelierSectionSkeleton } from "./_components/atelier-section";
import { FaqSection } from "@/modules/faq/components/faq-section";
import { FaqSectionSkeleton } from "@/modules/faq/components/faq-section-skeleton";
import { HeroSection } from "./_components/hero-section";
import { HeroSectionSkeleton } from "./_components/hero-section-skeleton";
import { LatestCreationsSkeleton } from "./_components/latest-creations-skeleton";
import { ReviewsSection } from "./_components/reviews-section";
import { ReviewsSectionSkeleton } from "./_components/reviews-section-skeleton";

export const metadata: Metadata = {
	title: {
		absolute: "Synclune | Bijoux artisanaux faits main",
	},
	description:
		"Bijoux faits main uniques et colorés. Boucles d'oreilles, colliers, bracelets créés avec amour par Léane. Éditions limitées, livraison rapide.",
	keywords: [
		"bijoux artisanaux",
		"bijoux faits main",
		"créatrice bijoux",
		"bijoux colorés",
		"bijoux originaux",
		"boucles d'oreilles artisanales",
		"colliers faits main",
		"bracelets artisanaux",
	],
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "Synclune | Bijoux artisanaux faits main",
		description:
			"Bijoux colorés faits main dans mon atelier. Boucles d'oreilles, colliers, bracelets. Pièces uniques.",
		url: SITE_URL,
		type: "website",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: "Synclune - Bijoux artisanaux faits main",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Synclune | Bijoux artisanaux faits main",
		description:
			"Bijoux artisanaux colorés faits main. Boucles d'oreilles, colliers, bracelets uniques. Créatrice indépendante.",
	},
};

export default async function Page() {
	// Kick off all data fetches in parallel
	const reviewStatsPromise = getGlobalReviewStats();
	const featuredReviewsPromise = getFeaturedReviews();

	// Shared between HeroSection (floating images) and LatestCreations (product cards)
	const latestCreationsPromise = getProducts(
		{
			perPage: 4,
			sortBy: "created-descending",
			filters: { status: "PUBLIC" },
		},
		{ isAdmin: false },
	);

	return (
		<>
			{/* JSON-LD schemas: LocalBusiness, Organization, WebSite, Founder, Article, Reviews */}
			<Suspense fallback={null}>
				<HomepageStructuredData
					reviewStatsPromise={reviewStatsPromise}
					featuredReviewsPromise={featuredReviewsPromise}
				/>
			</Suspense>

			{/* 1. Hero - Attention capture + rotating tagline + floating product images */}
			<Suspense fallback={<HeroSectionSkeleton />}>
				<HeroSection productsPromise={latestCreationsPromise} />
			</Suspense>

			{/* 2. Latest Creations - 4 most recent products */}
			<Suspense fallback={<LatestCreationsSkeleton />}>
				<LatestCreations productsPromise={latestCreationsPromise} />
			</Suspense>

			{/* 3. Collections - Thematic browsing with descriptions */}
			<Suspense fallback={<CollectionsSectionSkeleton collectionsCount={6} />}>
				<CollectionsSection
					collectionsPromise={getCollections({
						perPage: 6,
						sortBy: "created-descending",
						filters: {
							hasProducts: true,
							status: CollectionStatus.PUBLIC,
						},
					})}
				/>
			</Suspense>

			{/* 4. Reviews - Social proof with featured customer reviews */}
			<Suspense fallback={<ReviewsSectionSkeleton />}>
				<ReviewsSection
					reviewsPromise={featuredReviewsPromise}
					reviewStatsPromise={reviewStatsPromise}
				/>
			</Suspense>

			{/* 5. L'Atelier - Story + creative process merged */}
			<Suspense fallback={<AtelierSectionSkeleton />}>
				<AtelierSection />
			</Suspense>

			{/* 6. FAQ - Frequently asked questions with JSON-LD */}
			<Suspense fallback={<FaqSectionSkeleton />}>
				<FaqSection />
			</Suspense>
			<ScrollToTop />
		</>
	);
}

async function HomepageStructuredData({
	reviewStatsPromise,
	featuredReviewsPromise,
}: {
	reviewStatsPromise: Promise<GlobalReviewStats>;
	featuredReviewsPromise: Promise<ReviewHomepage[]>;
}) {
	const [reviewStats, featuredReviews] = await Promise.all([
		reviewStatsPromise,
		featuredReviewsPromise,
	]);

	return (
		<StructuredData
			reviewStats={reviewStats}
			includeHomepageSchemas
			featuredReviews={featuredReviews}
		/>
	);
}
