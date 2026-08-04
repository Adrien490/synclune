import { EtalSection } from "@/app/(shop)/(home)/_components/etal/etal-section";
import { ETAL_PRODUCTS_COUNT } from "@/app/(shop)/(home)/_components/etal/etal-grid";
import { getProducts, type GetProductsReturn } from "@/modules/products/data/get-products";
import { StructuredData } from "@/shared/components/structured-data";
import { SITE_URL } from "@/shared/constants/seo-config";
import type { Metadata } from "next";
import { Suspense } from "react";

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

/**
 * Page d'accueil — premier écran refondu en « L'étal » (2026-08-04).
 *
 * Le reste de la landing (collections, atelier, aide) reste à écrire : l'étal
 * est le premier écran, pas la page entière. La copie de l'ancienne section
 * Atelier est sauvegardée dans `docs/atelier-story.md` (⚠️ elle VOUVOIE, elle
 * se réécrit) ; les composants supprimés vivent dans l'historique git.
 *
 * La lecture catalogue est lancée ICI et passée en promesse à la section : elle
 * n'est attendue que derrière la frontière `Suspense` de la grille, donc elle
 * ne retarde jamais le `<h1>`. `isAdmin: false` explicite garde l'appel dans un
 * scope purement caché (`isAdmin()` lirait `headers()` et rendrait la page
 * dynamique pour rien).
 */
export default function Page() {
	const productsPromise = getProducts(
		{
			perPage: ETAL_PRODUCTS_COUNT,
			sortBy: "created-descending",
			filters: { status: "PUBLIC" },
		},
		{ isAdmin: false },
	);

	return (
		<>
			{/* L'ItemList a besoin des produits : sa propre frontière, pour que le
			    `<h1>` de l'étal ne dépende toujours d'aucun `await`. La MÊME
			    promesse est partagée avec la section — pas de second fetch. */}
			<Suspense fallback={<StructuredData includeHomepageSchemas />}>
				<HomepageStructuredData productsPromise={productsPromise} />
			</Suspense>
			<EtalSection productsPromise={productsPromise} />
		</>
	);
}

async function HomepageStructuredData({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const { products } = await productsPromise;

	return <StructuredData includeHomepageSchemas featuredProducts={products} />;
}
