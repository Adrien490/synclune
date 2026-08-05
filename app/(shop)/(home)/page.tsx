import { AtelierSection } from "@/app/(shop)/(home)/_components/atelier/atelier-section";
import { CollectionsSection } from "@/app/(shop)/(home)/_components/collections/collections-section";
import { LANDING_COLLECTIONS_COUNT } from "@/app/(shop)/(home)/_components/collections/collections-grid";
import { EtalSection } from "@/app/(shop)/(home)/_components/etal/etal-section";
import { ETAL_PRODUCTS_COUNT } from "@/app/(shop)/(home)/_components/etal/etal-grid";
import { FaqSection } from "@/app/(shop)/(home)/_components/faq/faq-section";
import { CollectionStatus } from "@/app/generated/prisma/client";
import { getCollections } from "@/modules/collections/data/get-collections";
import { getProducts, type GetProductsReturn } from "@/modules/products/data/get-products";
import { sortSoldOutLast } from "@/modules/products/services/product-availability.service";
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
 * L'ordre de lecture est délibéré : accroche produit (étal) → orientation
 * (collections, 2026-08-05 — cf. `docs/LANDING-SECTION-COLLECTIONS.md`) →
 * récit (atelier, 2026-08-05 — copie RÉÉCRITE au tutoiement dans la SSOT
 * `shared/constants/atelier-content.ts` ; `docs/atelier-story.md` reste
 * l'archive de la copie d'origine et le plan de swap des photos) →
 * réassurance (FAQ) → signature (footer). L'atelier est 100 % statique
 * (aucun fetch) : il se monte sans promesse ni Suspense, et son nœud `HowTo`
 * vit dans le `@graph` de `StructuredData`, comme le `FAQPage`.
 *
 * **La FAQ a rejoint la landing le 2026-08-05** : `/aide` n'existe plus et
 * redirige en 308 vers `/#faq` (`next.config.ts`). Son JSON-LD `FAQPage` est un
 * nœud du `@graph` de `StructuredData` — donc émis par les DEUX rendus autour de
 * la frontière `Suspense` ci-dessous, comme la `BreadcrumbList` de l'accueil
 * l'était déjà. Le `<script>` du repli est remplacé par celui du rendu résolu :
 * un seul survit dans le DOM final.
 *
 * La lecture catalogue est lancée ICI et passée en promesse à la section : elle
 * n'est attendue que derrière la frontière `Suspense` de la grille, donc elle
 * ne retarde jamais le `<h1>`. `isAdmin: false` explicite garde l'appel dans un
 * scope purement caché (`isAdmin()` lirait `headers()` et rendrait la page
 * dynamique pour rien).
 */
/**
 * Sur-allocation de la lecture catalogue, pour pouvoir pousser les pièces épuisées
 * en fin de liste sans jamais rendre moins de `ETAL_PRODUCTS_COUNT` cellules.
 *
 * Trois de plus, et pas dix : c'est un compromis entre « assez pour rattraper une
 * série de pièces vendues » et le coût d'une lecture plus large sur le chemin du
 * premier écran (chaque produit tire ses SKUs, médias, couleurs et matières).
 */
const ETAL_OVERFETCH = 3;

export default function Page() {
	const productsPromise = getProducts(
		{
			perPage: ETAL_PRODUCTS_COUNT + ETAL_OVERFETCH,
			sortBy: "created-descending",
			filters: { status: "PUBLIC" },
		},
		{ isAdmin: false },
	).then((result) => ({
		...result,
		// ⚠️ Le classement est appliqué ICI, une seule fois, PARCE QUE la promesse est
		// partagée entre la grille et l'ItemList du JSON-LD : réordonner dans la
		// grille seule ferait annoncer à Google un ordre que la page ne rend pas.
		//
		// Pourquoi réordonner : `getProducts` ne connaît aucun critère de stock, et
		// une carte épuisée perd son bouton d'ajout au panier. Sur un catalogue de
		// pièces UNIQUES — où l'épuisé est l'état terminal de chaque pièce, pas un cas
		// de bord — le premier écran de la boutique pouvait donc n'offrir aucun achat.
		// Le détail de l'arbitrage (réordonner et non filtrer) est dans
		// `sortSoldOutLast`.
		products: sortSoldOutLast(result.products).slice(0, ETAL_PRODUCTS_COUNT),
	}));

	// « Choisis ton univers » — mêmes critères MÉCANIQUES que le méga-menu
	// Collections (`getNavbarMenuData`) : les séries les plus fournies d'abord,
	// et uniquement celles qui ont des produits. `Collection` n'a pas
	// d'`isFeatured` (refus assumé) : il n'y a pas de mise en avant éditoriale
	// à exprimer, le tri EST le choix. `isAdmin: false` pour la même raison que
	// la lecture produits ci-dessus.
	const collectionsPromise = getCollections(
		{
			perPage: LANDING_COLLECTIONS_COUNT,
			sortBy: "products-descending",
			filters: { hasProducts: true, status: CollectionStatus.PUBLIC },
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
			<CollectionsSection collectionsPromise={collectionsPromise} />
			<AtelierSection />
			<FaqSection />
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
