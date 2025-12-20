import { Collections } from "@/app/(boutique)/(accueil)/_components/collections";
import { LatestCreations } from "@/app/(boutique)/(accueil)/_components/latest-creations";
import { LatestCreationsSkeleton } from "@/app/(boutique)/(accueil)/_components/latest-creations-skeleton";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProducts } from "@/modules/products/data/get-products";
import { getWishlistSkuIds } from "@/modules/wishlist/data/get-wishlist-sku-ids";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AtelierStory } from "./_components/atelier-story";
import { CreativeProcess } from "./_components/creative-process";
import { Hero } from "./_components/hero";

export const metadata: Metadata = {
	title: "Synclune | Bijoux artisanaux faits main à Nantes (44) - Loire-Atlantique",
	description:
		"Découvrez les bijoux colorés de Synclune, créatrice à Nantes. Boucles d'oreilles, colliers, bracelets faits main. Éditions limitées inspirées de Pokémon, Van Gogh, Twilight. Atelier artisanal en Loire-Atlantique.",
	keywords:
		"bijoux artisanaux Nantes, bijoux faits main Nantes, créatrice bijoux Nantes, bagues Nantes, colliers Nantes, boucles d'oreilles Nantes, bracelets Nantes, bijoux colorés Loire-Atlantique, bijoux pokemon Nantes, bijoux van gogh Nantes, atelier bijoux Nantes 44",
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: "Synclune | Bijoux artisanaux faits main à Nantes (44)",
		description:
			"Bijoux colorés faits main dans mon atelier nantais. Boucles d'oreilles, colliers, bracelets. Pièces uniques inspirées de Pokémon, Van Gogh, Twilight. Éditions limitées 5-10 exemplaires. Loire-Atlantique.",
		url: "https://synclune.fr",
		type: "website",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: "Synclune - Bijoux artisanaux faits main a Nantes (44)",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Synclune | Bijoux artisanaux faits main Nantes (44)",
		description:
			"Bijoux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets. Créations uniques inspirées de Pokémon, Van Gogh. Atelier Loire-Atlantique.",
	},
};


export default async function Page() {

	return (
		<>

			{/* 1. Hero - Capture d'attention + Positionnement de marque */}
			<Hero />

			{/* 2. Latest Creations - Product-first approach: 12 nouveautés pour engagement maximal */}
			<Suspense fallback={<LatestCreationsSkeleton productsCount={12} />}>
				<LatestCreations
					productsPromise={getProducts(
						{
							perPage: 12,
							sortBy: "created-descending",
							filters: {
								status: "PUBLIC",
							},
						},
						{ isAdmin: false }
					)}
					wishlistSkuIdsPromise={getWishlistSkuIds()}
				/>
			</Suspense>

			{/* 3. Collections - Exploration thématique + Navigation visuelle (remplace ProductTypes) */}
			<Suspense fallback={<CollectionsSectionSkeleton />}>
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

			{/* 4. AtelierStory - Storytelling intimiste de Léane (après engagement produit) */}
			<AtelierStory />

			{/* 5. CreativeProcess - Storytelling atelier + Connexion émotionnelle */}
			<CreativeProcess />
		</>
	);
}
