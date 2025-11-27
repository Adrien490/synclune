import {
	getLocalBusinessSchema,
	getWebSiteSchema,
} from "@/shared/constants/seo-config";
import { Collections } from "@/modules/collections/components/collections";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProducts } from "@/modules/products/data/get-products";
import { Suspense } from "react";
import { CreativeProcess } from "./_components/creative-process";
import { Hero } from "./_components/hero";
import { LatestCreations } from "@/modules/products/components/latest-creations";
import { LatestCreationsSkeleton } from "@/modules/products/components/latest-creations-skeleton";
import { NewsletterSection } from "@/modules/newsletter/components/newsletter-section";
import { WhySynclune } from "./_components/why-synclune";
import type { Metadata } from "next";

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
				url: "/og-image.jpg",
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
			"Bijoux colorés faits main à Nantes. Boucles d'oreilles, colliers, bracelets. Créations uniques inspirées de Pokémon, Van Gogh. Atelier Loire-Atlantique.",
	},
};


export default async function Page() {

	// Génération du structured data pour SEO
	const localBusinessSchema = getLocalBusinessSchema();
	const websiteSchema = getWebSiteSchema();

	return (
		<>
			{/* Structured Data JSON-LD pour SEO local (Nantes) */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(localBusinessSchema),
				}}
			/>

			{/* Structured Data WebSite avec SearchAction pour améliorer le référencement */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(websiteSchema),
				}}
			/>

			{/* 1. Hero - Capture d'attention + Positionnement de marque + Carousel bijoux */}
			<Hero />

			{/* 2. Latest Creations - Product-first approach: 12 nouveautés pour engagement maximal */}
			<Suspense fallback={<LatestCreationsSkeleton productsCount={12} />}>
				<LatestCreations
					productsPromise={getProducts({
						perPage: 12,
						sortBy: "created-descending",
						filters: {
							status: "PUBLIC",
						},
					})}
				/>
			</Suspense>

			{/* 3. Collections - Exploration thématique + Navigation visuelle (remplace ProductTypes) */}
			<Suspense>
				<Collections
					collectionsPromise={getCollections({
						perPage: 20,
						sortBy: "name-ascending",
						filters: {
							hasProducts: true,
						},
					})}
				/>
			</Suspense>

			{/* 4. WhySynclune - Réassurance artisan + Levée d'objections (après engagement produit) */}
			<WhySynclune />

			{/* 5. CreativeProcess - Storytelling atelier + Connexion émotionnelle */}
			<CreativeProcess />

			{/* 6. Newsletter - Inscription pour rester informé(e) des nouveautés */}
			<NewsletterSection />
		</>
	);
}
