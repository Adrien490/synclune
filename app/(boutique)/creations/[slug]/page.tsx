import { isAdmin } from "@/modules/auth/utils/guards";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ParticleBackground } from "@/shared/components/animations";
import { Separator } from "@/shared/components/ui/separator";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { getPublicProductSlugs } from "@/modules/products/data/get-public-product-slugs";
import { findSkuByVariants } from "@/modules/skus/services/sku-variant-finder.service";
import { filterCompatibleSkus } from "@/modules/skus/services/sku-filter.service";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { getProductReviewStats } from "@/modules/reviews/data/get-product-review-stats";
import { getAllProductReviews } from "@/modules/reviews/data/get-reviews";
import { getProductCartsCount } from "@/modules/cart/data/get-product-carts-count";

import { PageHeader } from "@/shared/components/page-header";
import { ProductDetails } from "@/modules/products/components/product-details";
import { Gallery } from "@/modules/media/components/gallery";
import { ProductInfo } from "@/modules/products/components/product-info";
import { StickyCartCTA } from "@/modules/products/components/sticky-cart-cta";

import { RelatedProducts } from "@/modules/products/components/related-products";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
import { RecentlyViewedProducts } from "@/modules/products/components/recently-viewed-products";
import { RecentlyViewedProductsSkeleton } from "@/modules/products/components/recently-viewed-products-skeleton";
import { RecordProductView } from "@/modules/products/components/record-product-view";
import { generateProductMetadata } from "@/modules/products/utils/seo/generate-metadata";
import { generateStructuredData } from "@/modules/products/utils/seo/generate-structured-data";

import { ProductReviewsSection, ProductReviewsSectionSkeleton } from "@/modules/reviews/components/product-reviews-section";

// Pre-genere les chemins des produits publics au build time
// Next.js 16 avec Cache Components requiert au moins un résultat
export async function generateStaticParams() {
	const products = await getPublicProductSlugs();
	if (products.length === 0) {
		return [{ slug: "__placeholder__" }];
	}
	return products.map((p) => ({ slug: p.slug }));
}

type ProductPageParams = Promise<{ slug: string }>;
type ProductSearchParams = Promise<{
	color?: string;
	material?: string;
	size?: string;
	ratingFilter?: string;
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
	const [admin, productData, wishlistProductIds] = await Promise.all([
		isAdmin(),
		(async () => {
			const product = await getProductBySlug({ slug, includeDraft: true });
			if (!product) return null;
			const [reviewStats, reviews, cartsCount] = await Promise.all([
				getProductReviewStats(product.id),
				getAllProductReviews(product.id, 10),
				getProductCartsCount(product.id),
			]);
			return { product, reviewStats, reviews, cartsCount };
		})(),
		getWishlistProductIds(),
	]);

	// Vérifier existence produit
	if (!productData) {
		notFound();
	}

	const { product, reviewStats, reviews, cartsCount } = productData;

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

	// Construction des breadcrumbs (aligné avec le structured data JSON-LD)
	const breadcrumbs = [
		{ label: "Créations", href: "/produits" },
		...(product.type
			? [{ label: product.type.label, href: `/produits/${product.type.slug}` }]
			: []),
		{ label: product.title, href: `/creations/${product.slug}` },
	];

	// Génération du structured data JSON-LD (avec stats avis et reviews pour Rich Snippets Google)
	const structuredData = generateStructuredData({
		product,
		selectedSku,
		reviewStats,
		reviews,
	});

	// Vérifier si le produit est dans la wishlist (lookup O(1) local)
	const isInWishlist = wishlistProductIds.has(product.id);

	// Validate ratingFilter bounds (1-5)
	const parsedRating = urlParams.ratingFilter ? parseInt(urlParams.ratingFilter, 10) : NaN;
	const ratingFilter = parsedRating >= 1 && parsedRating <= 5 ? parsedRating : undefined;

	return (
		<div className="min-h-screen relative">
			{/* Enregistrer la vue produit (client-side, non-bloquant) */}
			<RecordProductView slug={product.slug} />

			{/* Structured Data JSON-LD pour SEO */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
			/>

			{/* Particules précieuses pour pages produits */}
			<ParticleBackground count={8} size={[12, 80]} className="fixed inset-0 z-0" />

			<div className="relative z-10">
				<PageHeader title={product.title} breadcrumbs={breadcrumbs} className="hidden sm:block" />

				{/* Contenu principal */}
				<div className="bg-background pt-20 pb-6 sm:pt-4 sm:pb-12 lg:pt-6 lg:pb-16">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
						<article
							id="product-main"
							className="space-y-12"
						>
							{/* Section principale - Galerie fixe et Informations scrollables */}
							{/* group/product-details permet aux enfants de réagir au data-pending des sélecteurs */}
							<div className="group/product-details grid gap-6 lg:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
								{/* Galerie sticky sur desktop uniquement - avec hauteur max sécurisée */}
								<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit lg:max-h-[calc(100vh-6rem)] lg:overflow-hidden">
									<Gallery product={product} title={product.title} />
								</section>

								{/* Informations et configurateur scrollables */}
								<section className="space-y-6 lg:min-h-screen">
									{/* 1. ProductInfo - Badges, note, wishlist (pattern Etsy : contexte rapide) */}
									<ProductInfo
										product={product}
										isInWishlist={isInWishlist}
										reviewStats={reviewStats}
									/>

									<Separator className="bg-border" />

									{/* 2-6. ProductDetails - Prix, Caractéristiques, Variantes, Panier, Entretien */}
									{/* Composant client qui synchronise le SKU avec les paramètres URL */}
									<ProductDetails
										product={product}
										defaultSku={selectedSku}
										cartsCount={cartsCount}
									/>
								</section>
							</div>

							{/* Separator avant avis clients */}
							<Separator className="bg-border" />

							{/* 7. Avis clients (avant related/recently viewed - 72% lisent les avis avant d'acheter) */}
							<Suspense fallback={<ProductReviewsSectionSkeleton />}>
								<ProductReviewsSection
									productId={product.id}
									productSlug={product.slug}
									ratingFilter={ratingFilter}
								/>
							</Suspense>

							{/* Separator avant produits recemment vus */}
							<Separator className="bg-border" />

							{/* 8. RecentlyViewedProducts - Produits recemment consultes */}
							<Suspense fallback={<RecentlyViewedProductsSkeleton limit={4} />}>
								<RecentlyViewedProducts currentProductSlug={product.slug} limit={4} />
							</Suspense>

							{/* Separator avant produits similaires */}
							<Separator className="bg-border" />

							{/* 9. RelatedProducts - Produits similaires (algorithme contextuel intelligent) */}
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
