import { CollectionsSection } from "@/app/(shop)/(home)/_components/collections-section";
import { LatestCreations } from "@/app/(shop)/(home)/_components/latest-creations";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";

import { getProducts, type GetProductsReturn } from "@/modules/products/data/get-products";
import { ScrollToTop } from "@/shared/components/scroll-to-top";
import { StructuredData } from "@/shared/components/structured-data";
import { SITE_URL } from "@/shared/constants/seo-config";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AtelierSection, AtelierSectionSkeleton } from "./_components/atelier-section";
import { AtelierStats } from "./_components/atelier-section/atelier-stats";
import { HeroReassuranceBanner } from "./_components/hero-reassurance-banner";
import { HeroSection } from "./_components/hero-section";
import { HomeFaq } from "./_components/home-faq";

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

	return (
		<>
			{/* JSON-LD schemas: LocalBusiness, Organization, WebSite, Founder, Article, ItemList */}
			<Suspense fallback={null}>
				<HomepageStructuredData productsPromise={productsPromise} />
			</Suspense>

			{/* 1. Hero - Attention capture + rotating tagline + floating product images.
			    Rendered synchronously (no Suspense) so its SSR HTML — incl. the title
			    LCP text and the desktop floating images — is in the initial document. */}
			<HeroSection productsPromise={productsPromise} />

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

			{/* 4. L'Atelier - Story + creative process merged.
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

			{/* 5. FAQ - Long-tail SEO + last-mile reassurance */}
			<HomeFaq />

			<ScrollToTop />
		</>
	);
}

async function HomepageStructuredData({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const productsResult = await productsPromise;

	return <StructuredData includeHomepageSchemas featuredProducts={productsResult.products} />;
}
