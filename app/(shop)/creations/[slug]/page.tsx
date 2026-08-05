import { isAdmin } from "@/modules/auth/utils/guards";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { getProductBySlug } from "@/modules/products/data/get-product";
import { getRecentProductSlugs } from "@/modules/products/data/get-recent-product-slugs";
import { findSkuByVariants } from "@/modules/skus/services/sku-variant-finder.service";
import { filterCompatibleSkus } from "@/modules/skus/services/sku-filter.service";
import {
	extractVariantInfo,
	requiresSizeSelection,
} from "@/modules/skus/services/sku-info-extraction.service";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";

import { BreadcrumbNav } from "@/shared/components/breadcrumb-nav";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";
import { ProductAccentScope } from "@/modules/products/components/product-accent-scope";
import { ProductDetails } from "@/modules/products/components/product-details";
import { ProductMainSkeleton } from "@/modules/products/components/product-main-skeleton";
import { StickyCartCTADesktop } from "@/modules/products/components/sticky-cart-cta-desktop";
import { Gallery } from "@/modules/media/components/gallery";
import { ProductInfo } from "@/modules/products/components/product-info";

import { RelatedProducts } from "@/modules/products/components/related-products";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
import { RecentlyViewedProducts } from "@/modules/products/components/recently-viewed-products";
import { RecentlyViewedProductsSkeleton } from "@/modules/products/components/recently-viewed-products-skeleton";
import { RecordProductView } from "@/modules/products/components/record-product-view";
import { ViewItemTracker } from "@/shared/components/analytics/view-item-tracker";
import { generateProductMetadata } from "@/modules/products/utils/seo/generate-metadata";
import {
	generateStructuredData,
	getPriceValidUntil,
} from "@/modules/products/utils/seo/generate-structured-data";

// Pas de `generateStaticParams` : Cache Components refuse un tableau vide
// (`EmptyGenerateStaticParamsError` fait échouer le build entier), donc aucun
// déploiement n'était possible sans produit publié. Les fiches sont rendues à
// la demande, le cache restant assuré par le "use cache" de getProductBySlug().

type ProductPageParams = Promise<{ slug: string }>;
type ProductSearchParams = Promise<{
	/** Combo couleur M2M (norme depuis 2026-05-15, ex: "argent__or-rose") */
	variant?: string;
	/** @deprecated Slug couleur legacy — encore lu pour les liens/bookmarks anciens */
	color?: string;
	material?: string;
	size?: string;
}>;

export default async function ProductPage({
	params,
	searchParams,
}: {
	params: ProductPageParams;
	searchParams: ProductSearchParams;
}) {
	const [{ slug }, urlParams] = await Promise.all([params, searchParams]);

	// Paralléliser toutes les requêtes pour optimiser le TTFB.
	// `getRecentProductSlugs` est une simple lecture de cookie (aucune requête DB) :
	// elle sert à savoir s'il faut MONTER la section « Récemment vus », sans attendre
	// sa résolution — cf. `hasRecentlyViewed` plus bas.
	const [admin, product, wishlistProductIds, priceValidUntil, recentSlugs] = await Promise.all([
		isAdmin(),
		getProductBySlug({ slug, includeDraft: true }),
		getWishlistProductIds(),
		getPriceValidUntil(),
		getRecentProductSlugs(),
	]);

	// Vérifier existence produit
	if (!product) {
		notFound();
	}

	// Sécurité: Bloquer les DRAFT pour les non-admins
	if (product.status === "DRAFT" && !admin) {
		notFound();
	}

	// Bloquer les ARCHIVED pour tous (même admins sur le site public)
	if (product.status === "ARCHIVED") {
		notFound();
	}

	// Préparer les variants depuis searchParams.
	// `variant` (combo M2M) prime sur `color` legacy — matchColor applique colorCombo
	// en priorité (set égalité strict). Sans ce champ, un deep-link `?variant=` rendrait
	// le SKU par défaut côté serveur (flash de couleur à l'hydratation).
	const urlVariants = {
		colorCombo: urlParams.variant,
		colorSlug: urlParams.color,
		materialSlug: urlParams.material,
		size: urlParams.size,
	};

	// Vérifier que le produit a au moins un SKU actif
	if (product.skus.length === 0) {
		notFound();
	}

	// Calcul du SKU sélectionné depuis les paramètres URL
	// Par défaut : product.skus[0] (SKU principal, trié par isDefault DESC)
	let selectedSku = product.skus[0]!;

	if (Object.values(urlVariants).some((v) => v)) {
		// Cast: findSkuByVariants retourne BaseProductSku (forme minimale partagée
		// avec les services skus), mais l'objet sous-jacent est bien product.skus[N]
		// qui inclut Color.description + Material.description via GET_PRODUCT_SELECT.
		const exactSku = findSkuByVariants(product, urlVariants) as typeof selectedSku | null;
		if (exactSku) {
			selectedSku = exactSku;
		} else {
			// Sinon, prendre le premier SKU compatible
			const compatibleSkus = filterCompatibleSkus(product, urlVariants) as Array<
				typeof selectedSku
			>;
			if (compatibleSkus.length > 0) {
				selectedSku = compatibleSkus[0]!;
			}
		}
	}

	// Construction des breadcrumbs (aligné avec le structured data JSON-LD)
	const breadcrumbs = [
		{ label: "Créations", href: "/produits" },
		...(product.type
			? [{ label: product.type.label, href: `/produits/${product.type.slug}` }]
			: []),
		{ label: product.title, href: `/creations/${product.slug}` },
	];

	// Génération du structured data JSON-LD
	const structuredData = generateStructuredData({
		product,
		selectedSku,
		priceValidUntil,
	});

	// Vérifier si le produit est dans la wishlist (lookup O(1) local)
	const isInWishlist = wishlistProductIds.has(product.id);

	// La section « Récemment vus » n'est montée que si le cookie contient au moins
	// un AUTRE produit. Sans ce garde, la première fiche de chaque visite affichait
	// un squelette de 4 cartes pour une section qui résolvait à `null` — un fantôme,
	// puisque `RecordProductView` n'écrit le cookie qu'après ce rendu et que la fiche
	// courante est exclue de la liste.
	const hasRecentlyViewed = recentSlugs.some((s) => s !== product.slug);
	const recentlyViewedLimit = Math.min(4, recentSlugs.filter((s) => s !== product.slug).length);

	// Réserves EXACTES du squelette de la colonne d'achat. Le produit est déjà
	// résolu ici, donc on n'a pas à deviner : les mêmes prédicats que
	// `VariantSelector` (carte affichée si > 1 SKU ; axe secondaire si plusieurs
	// matériaux, ou si une taille est requise). Sans ça le squelette dessinait
	// toujours une carte à trois plaquettes plus un axe secondaire — sur une fiche
	// mono-SKU, ~250 px réservés pour rien, que le contenu remontait au swap.
	const variantInfo = extractVariantInfo(product);
	const hasSecondaryAxis =
		variantInfo.availableMaterials.length > 1 ||
		(requiresSizeSelection(product, variantInfo) && variantInfo.availableSizes.length > 0);
	const skeletonVariantAxisCount = product.skus.length > 1 ? (hasSecondaryAxis ? 2 : 1) : 0;

	return (
		<div className="relative min-h-dvh">
			{/* Enregistrer la vue produit (client-side, non-bloquant) */}
			<RecordProductView slug={product.slug} />

			{/* Funnel analytics : view_item (consent-gated, fire-once) */}
			<ViewItemTracker
				productId={product.id}
				slug={product.slug}
				priceCents={selectedSku.priceInclTax}
			/>

			{/* Structured Data JSON-LD pour SEO — SAFE: serialized via safeJsonLd */}
			{/* react-doctor-disable-next-line react/no-danger */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{
					__html: safeJsonLd(structuredData),
				}}
			/>

			<div className="relative z-10">
				{/* Shell « L'étal continue » — plus de bande d'en-tête : le h1 vit dans
				    `ProductInfo`, visible à tous les viewports. Le `BreadcrumbList` de
				    la page est déjà dans le @graph de `generateStructuredData` ;
				    `BreadcrumbNav` est visuel pur. */}
				<div className="bg-background pt-[calc(var(--navbar-height-static)+0.75rem)] pb-6 sm:pb-12 lg:pt-[calc(var(--navbar-height-static)+1.25rem)] lg:pb-16">
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<BreadcrumbNav
							items={breadcrumbs}
							className="text-muted-foreground hidden pb-5 text-sm leading-normal md:block"
						/>
						{/* `ProductAccentScope` pose `--piece-accent` (la couleur de la variante
						    affichée) sur l'article : la galerie, l'aplat du prix, le nuancier et
						    le CTA la partagent au lieu de la voir s'arrêter au carton photo. */}
						<ProductAccentScope product={product} className="space-y-12">
							{/* Section principale - Galerie fixe et Informations scrollables */}
							{/* group/product-details permet aux enfants de réagir au data-pending des sélecteurs */}
							<Suspense
								fallback={
									<ProductMainSkeleton
										variantAxisCount={skeletonVariantAxisCount}
										swatchCount={Math.max(1, variantInfo.availableCombos.length)}
									/>
								}
							>
								<div className="group/product-details grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
									{/* Galerie sticky sur desktop uniquement.
									    L'offset RÉSERVE la barre d'achat collante (`--pdp-cta-bar-height`,
									    publiée par `StickyCartCTADesktop`) : les deux s'ancraient sinon à
									    `--navbar-height`, la barre étant z-70 contre z-10 ici, et elle
									    recouvrait le scotch + le haut de la photo — que `lg:overflow-hidden`
									    rendait alors irrécupérables au scroll. La variable vaut 0 tant que
									    la barre est absente, donc l'offset nu reste le cas nominal. */}
									<section className="lg:sticky lg:top-[calc(var(--navbar-height)+var(--pdp-cta-bar-height,0px))] lg:z-10 lg:h-fit lg:max-h-[calc(100dvh-6rem-var(--pdp-cta-bar-height,0px))] lg:overflow-hidden">
										<Gallery product={product} title={product.title} />
									</section>

									{/* Informations et configurateur scrollables */}
									<section className="space-y-6 lg:min-h-dvh">
										{/* 1. ProductInfo - type, titre, provenance, partage, favoris */}
										<ProductInfo product={product} isInWishlist={isInWishlist} />

										{/* 2-6. ProductDetails - Prix, Caractéristiques, Variantes, Panier, Entretien */}
										{/* Composant client qui synchronise le SKU avec les paramètres URL */}
										<ProductDetails product={product} defaultSku={selectedSku} />
									</section>
								</div>
							</Suspense>

							{/* Sticky add-to-cart desktop (apparaît quand le CTA principal sort du viewport) */}
							<StickyCartCTADesktop product={product} defaultSku={selectedSku} />

							{/* 7. RecentlyViewedProducts — produits récemment consultés.
							    Le séparateur d'ouverture vit DANS la section (et dans son
							    squelette) : rendu ici, il ne pouvait pas disparaître avec
							    elle, et les deux filets de la page se retrouvaient collés. */}
							{hasRecentlyViewed && (
								<Suspense fallback={<RecentlyViewedProductsSkeleton limit={recentlyViewedLimit} />}>
									<RecentlyViewedProducts
										currentProductSlug={product.slug}
										limit={recentlyViewedLimit}
									/>
								</Suspense>
							)}

							{/* 8. RelatedProducts - Produits similaires (algorithme contextuel intelligent) */}
							<Suspense fallback={<RelatedProductsSkeleton limit={4} />}>
								<RelatedProducts currentProductSlug={product.slug} limit={4} />
							</Suspense>
						</ProductAccentScope>
					</div>
				</div>
			</div>
		</div>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateProductMetadata as generateMetadata };
