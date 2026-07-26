import { CollectionsSection } from "@/app/(shop)/(home)/_components/collections-section";
import { LatestCreations } from "@/app/(shop)/(home)/_components/latest-creations";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";

import { getProducts, type GetProductsReturn } from "@/modules/products/data/get-products";
import { getFeaturedReviews } from "@/modules/reviews/data/get-featured-reviews";
import { getGlobalReviewStats } from "@/modules/reviews/data/get-global-review-stats";
import type { ReviewHomepage } from "@/modules/reviews/types/review.types";
import { OrdersClosedNotice } from "@/modules/store-settings/components/orders-closed-notice";
import { ScrollToTop } from "@/shared/components/scroll-to-top";
import { StructuredData } from "@/shared/components/structured-data";
import { ORDERS_AVAILABLE } from "@/shared/constants/orders-availability";
import { type GlobalReviewStats, SITE_URL } from "@/shared/constants/seo-config";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AtelierSection, AtelierSectionSkeleton } from "./_components/atelier-section";
import { AtelierStats } from "./_components/atelier-section/atelier-stats";
import { BestRatedCreations, BEST_RATED_MIN_RATING } from "./_components/best-rated-creations";
import { HeroReassuranceBanner } from "./_components/hero-reassurance-banner";
import { HeroSection } from "./_components/hero-section";
import { HomeFaq } from "./_components/home-faq";
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
	// Kick off cached data fetches in parallel (all have "use cache" at top level)
	const productsPromise = getProducts(
		{ perPage: 4, sortBy: "created-descending", filters: { status: "PUBLIC" } },
		{ isAdmin: false },
	);
	const reviewStatsPromise = getGlobalReviewStats();
	const featuredReviewsPromise = getFeaturedReviews();
	// Best-rated rail data — dedicated cached fetch (rating-descending + ratingMin).
	// Kicked off in parallel; the section self-hides if too few rated products.
	const bestRatedPromise = getProducts(
		{
			perPage: 4,
			sortBy: "rating-descending",
			filters: { status: "PUBLIC", ratingMin: BEST_RATED_MIN_RATING },
		},
		{ isAdmin: false },
	);

	return (
		<>
			{/* JSON-LD schemas: LocalBusiness, Organization, WebSite, Founder, Article, Reviews, ItemList */}
			<Suspense fallback={null}>
				<HomepageStructuredData
					reviewStatsPromise={reviewStatsPromise}
					featuredReviewsPromise={featuredReviewsPromise}
					productsPromise={productsPromise}
				/>
			</Suspense>

			{/* 1. Hero - Attention capture + rotating tagline + floating product images.
			    Rendered synchronously (no Suspense) so its SSR HTML — incl. the title
			    LCP text and the desktop floating images — is in the initial document. */}
			<HeroSection productsPromise={productsPromise} />

			{/* 1a. Pré-lancement : tant que les commandes sont en pause, on cadre
			    l'attente dès la home (au lieu de laisser le visiteur le découvrir
			    sur une fiche/le panier). Avis en flux normal SOUS le hero — pas une
			    bannière haute (qui entrait en conflit avec la navbar transparente,
			    cf. retrait commit ba16d5f0). SSOT : `orders-availability.ts`. */}
			{!ORDERS_AVAILABLE && (
				<div className={CONTAINER_CLASS}>
					<OrdersClosedNotice className="my-6" />
				</div>
			)}

			{/* 1b. Reassurance banner - Baymard trust signals immediately under hero */}
			<HeroReassuranceBanner />

			{/* 2. Latest Creations - 4 most recent products.
			    Rendered synchronously (productsPromise already awaited by HeroSection
			    above) so React 19 hoists `<link rel="preload">` for the mobile LCP
			    image — ProductCard[0], where the hero floating images are hidden
			    (`hidden md:block`). Only the first card preloads (see latest-creations.tsx). */}
			<LatestCreations productsPromise={productsPromise} />

			{/* 3. Collections - Thematic browsing with descriptions */}
			<Suspense fallback={<CollectionsSectionSkeleton collectionsCount={6} />}>
				<CollectionsSection />
			</Suspense>

			{/* 3b. Les mieux notées - preuve sociale par la note, juste avant les avis.
			    Suspense fallback={null} : la section s'auto-masque s'il n'y a pas assez
			    de produits notés (cas pré-lancement) sans skeleton fantôme ni couplage
			    au LCP du hero. */}
			<Suspense fallback={null}>
				<BestRatedCreations productsPromise={bestRatedPromise} />
			</Suspense>

			{/* 4. Reviews - Social proof with featured customer reviews */}
			<Suspense fallback={<ReviewsSectionSkeleton />}>
				<ReviewsSection
					reviewsPromise={featuredReviewsPromise}
					reviewStatsPromise={reviewStatsPromise}
				/>
			</Suspense>

			{/* 5. L'Atelier - Story + creative process merged.
			    `stats` passe en slot ReactNode à travers le "use cache" reference de la
			    section : les counts (profil catalog) restent frais sans figer la section. */}
			<Suspense fallback={<AtelierSectionSkeleton />}>
				<AtelierSection
					stats={
						/* key explicite : un élément JSX qui traverse un composant "use cache"
						   est désérialisé comme enfant « de liste » → warning React sans key. */
						<Suspense key="atelier-stats" fallback={null}>
							<AtelierStats />
						</Suspense>
					}
				/>
			</Suspense>

			{/* 6. FAQ - Long-tail SEO + last-mile reassurance */}
			<HomeFaq />

			<ScrollToTop />
		</>
	);
}

async function HomepageStructuredData({
	reviewStatsPromise,
	featuredReviewsPromise,
	productsPromise,
}: {
	reviewStatsPromise: Promise<GlobalReviewStats>;
	featuredReviewsPromise: Promise<ReviewHomepage[]>;
	productsPromise: Promise<GetProductsReturn>;
}) {
	const [reviewStats, featuredReviews, productsResult] = await Promise.all([
		reviewStatsPromise,
		featuredReviewsPromise,
		productsPromise,
	]);

	return (
		<StructuredData
			reviewStats={reviewStats}
			includeHomepageSchemas
			featuredReviews={featuredReviews}
			featuredProducts={productsResult.products}
		/>
	);
}
