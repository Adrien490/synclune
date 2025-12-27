import { Bestsellers } from "@/app/(boutique)/(accueil)/_components/bestsellers";
import { BestsellersSkeleton } from "@/app/(boutique)/(accueil)/_components/bestsellers-skeleton";
import { Collections } from "@/app/(boutique)/(accueil)/_components/collections";
import { LatestCreations } from "@/app/(boutique)/(accueil)/_components/latest-creations";
import { LatestCreationsSkeleton } from "@/app/(boutique)/(accueil)/_components/latest-creations-skeleton";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProducts } from "@/modules/products/data/get-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { SparklesDivider } from "@/shared/components/section-divider";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { AtelierStory } from "./_components/atelier-story";
import { CreativeProcess } from "./_components/creative-process";
import { Hero } from "./_components/hero";

// Lazy load Client Components below the fold
const FaqSection = dynamic(
	() => import("./_components/faq-section").then((mod) => mod.FaqSection),
	{ ssr: true } // Garder SSR pour le JSON-LD SEO
);

const NewsletterSection = dynamic(
	() =>
		import("@/modules/newsletter/components/newsletter-section").then(
			(mod) => mod.NewsletterSection
		),
	{ ssr: true }
);

export const metadata: Metadata = {
	title: {
		absolute: "Synclune | Bijoux artisanaux faits main à Nantes",
	},
	description:
		"Bijoux artisanaux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets uniques. Créatrice Loire-Atlantique.",
	keywords:
		"bijoux artisanaux Nantes, bijoux faits main Nantes, créatrice bijoux Nantes, bagues Nantes, colliers Nantes, boucles d'oreilles Nantes, bracelets Nantes, bijoux colorés Loire-Atlantique. atelier bijoux Nantes 44",
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "Synclune | Bijoux artisanaux faits main à Nantes (44)",
		description:
			"Bijoux colorés faits main dans mon atelier nantais. Boucles d'oreilles, colliers, bracelets. Loire-Atlantique.",
		url: "https://synclune.fr",
		type: "website",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: "Synclune - Bijoux artisanaux faits main à Nantes (44)",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Synclune | Bijoux artisanaux faits main Nantes (44)",
		description:
			"Bijoux artisanaux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets uniques. Créatrice Loire-Atlantique.",
	},
};


export default async function Page() {
	// Dedupliquer l'appel getWishlistProductIds() pour Bestsellers et LatestCreations
	const wishlistIdsPromise = getWishlistProductIds();

	return (
		<>

			{/* 1. Hero - Capture d'attention + Positionnement de marque */}
			<Hero />

			{/* 1.5. Bestsellers - Les bijoux les plus vendus (preuve sociale) */}
			<Suspense fallback={<BestsellersSkeleton />}>
				<Bestsellers
					productsPromise={getProducts(
						{
							perPage: 8,
							sortBy: "best-selling",
							filters: {
								status: "PUBLIC",
							},
						},
						{ isAdmin: false }
					)}
					wishlistProductIdsPromise={wishlistIdsPromise}
				/>
			</Suspense>

			{/* 2. Latest Creations - Product-first approach: 8 nouveautés */}
			<Suspense fallback={<LatestCreationsSkeleton productsCount={8} />}>
				<LatestCreations
					productsPromise={getProducts(
						{
							perPage: 8,
							sortBy: "created-descending",
							filters: {
								status: "PUBLIC",
							},
						},
						{ isAdmin: false }
					)}
					wishlistProductIdsPromise={wishlistIdsPromise}
				/>
			</Suspense>

			{/* 3. Collections - Exploration thématique + Navigation visuelle (remplace ProductTypes) */}
			<Suspense fallback={<CollectionsSectionSkeleton collectionsCount={6} />}>
				<Collections
					collectionsPromise={getCollections({
						perPage: 6,
						sortBy: "name-ascending",
						filters: {
							hasProducts: true,
							status: CollectionStatus.PUBLIC,
						},
					})}
				/>
			</Suspense>

			{/* Séparateur décoratif girly */}
			<SparklesDivider />

			{/* 4. AtelierStory - Storytelling intimiste de Léane (après engagement produit) */}
			<AtelierStory />

			{/* 5. CreativeProcess - Storytelling atelier + Connexion émotionnelle */}
			<CreativeProcess />

			{/* 6. FAQ - Questions fréquentes avec schema SEO */}
			<FaqSection />

			{/* 7. Newsletter - Inscription à la newsletter */}
			<NewsletterSection />
		</>
	);
}
