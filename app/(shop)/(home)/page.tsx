import { AtelierSection } from "@/app/(shop)/(home)/_components/atelier/atelier-section";
import { HeroSection } from "@/app/(shop)/(home)/_components/hero/hero-section";
import { HERO_PRODUCTS_COUNT } from "@/app/(shop)/(home)/_components/hero/hero-grid";
import { getProducts, type GetProductsReturn } from "@/modules/products/data/get-products";
import { orderHeroProducts } from "@/modules/products/services/product-availability.service";
import { StructuredData } from "@/shared/components/structured-data";
/*
 * ⚠️ Titre et description viennent de la SSOT `seo-config` depuis le 2026-08-06.
 * Ils vivaient ICI, et le repli global (`root-metadata.ts`) en portait une
 * version PÉRIMÉE — « Bijoux artisanaux faits main » — en cinq littéraux. Deux
 * définitions de la même phrase divergent toujours ; celle qui dérive est
 * invariablement la moins visible, donc la moins relue.
 */
import { HOME_DESCRIPTION, HOME_OG_ALT, HOME_TITLE, SITE_URL } from "@/shared/constants/seo-config";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
	title: {
		absolute: HOME_TITLE,
	},
	description: HOME_DESCRIPTION,
	// Reprises verbatim de `docs/BRAND-DA.md` § Expressions à privilégier — le
	// `keywords` de Next ne pèse plus rien en SEO, mais c'est de la copie de
	// marque comme le reste, et elle n'a pas de raison de diverger.
	keywords: [
		"bijoux colorés faits main",
		"bijoux faits main à Nantes",
		"bijoux de créatrice française",
		"boucles d'oreilles colorées artisanales",
		"bague peinte à la main",
		"bijoux arc-en-ciel artisanaux",
	],
	alternates: {
		canonical: "/",
	},
	openGraph: {
		title: HOME_TITLE,
		description: HOME_DESCRIPTION,
		url: SITE_URL,
		type: "website",
		images: [
			{
				url: "/opengraph-image",
				width: 1200,
				height: 630,
				alt: HOME_OG_ALT,
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: HOME_TITLE,
		description: HOME_DESCRIPTION,
	},
};

/**
 * Page d'accueil — premier écran refondu en « L'étal » (2026-08-04).
 *
 * L'ordre de lecture est délibéré : accroche produit (étal) →
 * récit (atelier, 2026-08-05 — copie RÉÉCRITE au tutoiement dans la SSOT
 * `shared/constants/atelier-content.ts`) → signature (footer). L'atelier est
 * 100 % statique (aucun fetch) : il se monte sans promesse ni Suspense, et son
 * nœud `HowTo` vit dans le `@graph` de `StructuredData`.
 *
 * ⚠️ **La section Collections et la FAQ ont été retirées le 2026-08-08**, à la
 * demande de Léane et pour être refaites : la landing n'a donc plus ni bloc
 * d'orientation ni bloc de réassurance. Deux conséquences à connaître avant de
 * les rebâtir — le `FAQPage` a quitté le `@graph` de `StructuredData` (le
 * rouvrir se fait dans ce `@graph`, JAMAIS en `<script>` séparé, sinon on
 * ré-introduit la seconde `BreadcrumbList` au premier copier-coller), et
 * `/aide` ne redirige plus vers `/#faq` — la règle 308 de `next.config.ts`,
 * `ROUTES.SHOP.HELP` et les liens « Aide » du pied de page et du volet mobile
 * sont partis avec.
 *
 * ⚠️ L'accueil n'émet **plus de `BreadcrumbList`** depuis le 2026-08-06 : elle
 * n'avait qu'un `ListItem` pointant la racine, soit exactement l'élément que
 * Google demande d'omettre. Détail dans `structured-data.tsx`.
 *
 * La lecture catalogue est lancée ICI et passée en promesse à la section : elle
 * n'est attendue que derrière la frontière `Suspense` de la grille, donc elle
 * ne retarde jamais le `<h1>`. `isAdmin: false` explicite garde l'appel dans un
 * scope purement caché (`isAdmin()` lirait `headers()` et rendrait la page
 * dynamique pour rien).
 */
/**
 * Sur-allocation de la lecture catalogue, pour que le classement du premier écran
 * ait de la matière : pousser les pièces épuisées en fin de liste, PUIS étaler les
 * types, sans jamais rendre moins de `HERO_PRODUCTS_COUNT` cellules.
 *
 * ⚠️ Porté de 3 à 10 le 2026-08-06. Trois suffisaient à rattraper une série de
 * pièces vendues ; ils ne suffisent pas à étaler les types, qui est le second
 * critère. Avec 8 pièces lues, un catalogue qui vient de recevoir cinq paires de
 * boucles n'a tout simplement pas de bague à proposer au classement — mesuré : le
 * premier écran rendait trois « Papilloux » et deux « Chaîne de corps ».
 *
 * Dix et pas trente : la lecture reste derrière la frontière `Suspense` de la
 * grille (elle ne retarde jamais le `<h1>`), mais chaque produit tire ses SKUs,
 * médias, couleurs et matières — c'est le coût qui borne ce nombre.
 */
const HERO_OVERFETCH = 10;

export default function Page() {
	const productsPromise = getProducts(
		{
			perPage: HERO_PRODUCTS_COUNT + HERO_OVERFETCH,
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
		// `orderHeroProducts` enchaîne les deux critères, dans cet ordre :
		//
		//  1. **disponibilité** — `getProducts` ne connaît aucun critère de stock, et
		//     une carte épuisée perd son bouton d'ajout au panier. Sur un catalogue de
		//     pièces UNIQUES, où l'épuisé est l'état terminal de chaque pièce et non un
		//     cas de bord, le premier écran pouvait n'offrir AUCUN achat ;
		//  2. **étalement des types** — par récence pure, les cinq cellules rendaient
		//     trois « Papilloux » et deux « Chaîne de corps » : aucune bague, aucun
		//     bracelet, aucun collier. Baymard mesure que les visiteuses qui ne voient
		//     pas le type qu'elles cherchent en concluent qu'il n'est pas vendu.
		//
		// L'ordre des deux compte, et le détail de l'arbitrage vit dans le service.
		products: orderHeroProducts(result.products).slice(0, HERO_PRODUCTS_COUNT),
	}));

	return (
		<>
			{/* L'ItemList a besoin des produits : sa propre frontière, pour que le
			    `<h1>` de l'étal ne dépende toujours d'aucun `await`. La MÊME
			    promesse est partagée avec la section — pas de second fetch. */}
			<Suspense fallback={<StructuredData includeHomepageSchemas />}>
				<HomepageStructuredData productsPromise={productsPromise} />
			</Suspense>
			<HeroSection productsPromise={productsPromise} />
			<AtelierSection />
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
