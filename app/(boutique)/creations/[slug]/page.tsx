import { isAdmin } from "@/modules/auth/utils/guards";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { Separator } from "@/shared/components/ui/separator";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { findSkuByVariants } from "@/modules/skus/services/find-sku-by-variants";
import { filterCompatibleSkus } from "@/modules/skus/services/filter-compatible-skus";
import { getWishlistSkuIds } from "@/modules/wishlist/data/get-wishlist-sku-ids";
import { getSwipeHintSeen } from "@/modules/media/data/get-swipe-hint-seen";

import { PageHeader } from "@/shared/components/page-header";
import { ProductDetails } from "@/modules/products/components/product-details";
import { Gallery } from "@/modules/media/components/gallery";
import { ProductInfo } from "@/modules/products/components/product-info";
import { StickyCartCTA } from "@/shared/components/sticky-cart-cta";

import { RelatedProducts } from "@/modules/products/components/related-products";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
import { RecentlyViewedProducts } from "@/modules/products/components/recently-viewed-products";
import { RecentlyViewedProductsSkeleton } from "@/modules/products/components/recently-viewed-products-skeleton";
import { RecordProductView } from "@/modules/products/components/record-product-view";
import { generateProductMetadata } from "@/modules/products/utils/seo/generate-metadata";
import { generateStructuredData } from "@/modules/products/utils/seo/generate-structured-data";

type ProductPageParams = Promise<{ slug: string }>;
type ProductSearchParams = Promise<{
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
	const { slug } = await params;
	const urlParams = await searchParams;

	// Paralléliser toutes les requêtes pour optimiser le TTFB
	const [admin, product, hasSeenSwipeHint, wishlistSkuIds] = await Promise.all([
		isAdmin(),
		getProductBySlug({ slug, includeDraft: true }), // Récupérer avec DRAFT, filtrer après
		getSwipeHintSeen(),
		getWishlistSkuIds(), // Récupérer tous les SKU IDs de la wishlist en parallèle
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

	// Préparer les variants depuis searchParams
	const urlVariants = {
		colorSlug: urlParams.color,
		materialSlug: urlParams.material,
		size: urlParams.size,
	};

	// Vérifier que le produit a au moins un SKU actif
	if (!product.skus || product.skus.length === 0) {
		notFound();
	}

	// Calcul du SKU sélectionné depuis les paramètres URL
	// Par défaut : product.skus[0] (SKU principal, trié par isDefault DESC)
	let selectedSku = product.skus[0];

	if (Object.values(urlVariants).some((v) => v)) {
		const exactSku = findSkuByVariants(product, urlVariants);
		if (exactSku) {
			selectedSku = exactSku;
		} else {
			// Sinon, prendre le premier SKU compatible
			const compatibleSkus = filterCompatibleSkus(product, urlVariants);
			if (compatibleSkus.length > 0) {
				selectedSku = compatibleSkus[0];
			}
		}
	}

	// Construction des breadcrumbs
	const breadcrumbs = [
		{ label: "Créations", href: "/produits" },
		{ label: product.title, href: `/creations/${product.slug}` },
	];

	// Génération du structured data JSON-LD
	const structuredData = generateStructuredData(product, selectedSku);

	// Vérifier si le SKU sélectionné est dans la wishlist (lookup O(1) local)
	const isInWishlist = wishlistSkuIds.has(selectedSku.id);

	return (
		<div className="min-h-screen relative">
			{/* Skip link pour accessibilité - permet de passer directement au contenu */}
			<a
				href="#product-main"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
			>
				Aller au contenu principal
			</a>

			{/* Enregistrer la vue produit (client-side, non-bloquant) */}
			<RecordProductView slug={product.slug} />

			{/* Structured Data JSON-LD pour SEO */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
			/>

			{/* Particules précieuses pour pages produits */}
			<ParticleSystem count={8} size={[12, 80]} className="fixed inset-0 z-0" />

			<div className="relative z-10">
				<PageHeader title={product.title} breadcrumbs={breadcrumbs} className="hidden sm:block" />

				{/* Contenu principal */}
				<div className="bg-background pt-20 pb-6 sm:pt-4 sm:pb-12 lg:pt-6 lg:pb-16">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
						<article
							id="product-main"
							itemScope
							itemType="https://schema.org/Product"
							className="space-y-12"
						>
							{/* Section principale - Galerie fixe et Informations scrollables */}
							{/* group/product-details permet aux enfants de réagir au data-pending des sélecteurs */}
							<div className="group/product-details grid gap-6 lg:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
								{/* Galerie sticky sur desktop uniquement - avec hauteur max sécurisée */}
								<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
									<Gallery product={product} title={product.title} hasSeenSwipeHint={hasSeenSwipeHint} />
								</section>

								{/* Informations et configurateur scrollables */}
								<section className="space-y-6 lg:min-h-screen">
									{/* 1. ProductInfo - Infos de base avec bouton wishlist dynamique */}
									<ProductInfo
										product={product}
										defaultSku={selectedSku}
										isInWishlist={isInWishlist}
									/>

									<Separator className="bg-border" />

									{/* 2-6. ProductDetails - Prix, Caractéristiques, Variantes, Panier, Entretien */}
									{/* Composant client qui synchronise le SKU avec les paramètres URL */}
									<ProductDetails
										product={product}
										defaultSku={selectedSku}
									/>
								</section>
							</div>

							{/* Separator avant produits recemment vus */}
							<Separator className="bg-border" />

							{/* 7. RecentlyViewedProducts - Produits recemment consultes */}
							<Suspense fallback={<RecentlyViewedProductsSkeleton limit={4} />}>
								<RecentlyViewedProducts currentProductSlug={product.slug} />
							</Suspense>

							{/* Separator avant produits similaires */}
							<Separator className="bg-border" />

							{/* 8. RelatedProducts - Produits similaires (algorithme contextuel intelligent) */}
							<Suspense fallback={<RelatedProductsSkeleton limit={8} />}>
								<RelatedProducts currentProductSlug={product.slug} limit={8} />
							</Suspense>
						</article>
					</div>
				</div>
			</div>

			{/* Sticky CTA mobile - apparait quand le bouton principal sort du viewport */}
			<StickyCartCTA product={product} defaultSku={selectedSku} />
		</div>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateProductMetadata as generateMetadata };
