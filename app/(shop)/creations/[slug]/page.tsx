import { isAdmin } from "@/modules/auth/utils/guards";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Separator } from "@/shared/components/ui/separator";
import { getProductBySlug } from "@/modules/products/data/get-product";
import { findSkuByVariants } from "@/modules/skus/services/sku-variant-finder.service";
import { filterCompatibleSkus } from "@/modules/skus/services/sku-filter.service";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { getProductCartsCount } from "@/modules/cart/data/get-product-carts-count";

import { PageHeader } from "@/shared/components/page-header";
import { safeJsonLd } from "@/shared/utils/safe-json-ld";
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
import { generateStructuredData } from "@/modules/products/utils/seo/generate-structured-data";

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

	// Paralléliser toutes les requêtes pour optimiser le TTFB
	const [admin, productData, wishlistProductIds] = await Promise.all([
		isAdmin(),
		(async () => {
			const product = await getProductBySlug({ slug, includeDraft: true });
			if (!product) return null;
			const cartsCount = await getProductCartsCount(product.id);
			return { product, cartsCount };
		})(),
		getWishlistProductIds(),
	]);

	// Vérifier existence produit
	if (!productData) {
		notFound();
	}

	const { product, cartsCount } = productData;

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
	});

	// Vérifier si le produit est dans la wishlist (lookup O(1) local)
	const isInWishlist = wishlistProductIds.has(product.id);

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
				{/* noStructuredData: BreadcrumbList déjà inclus dans generateStructuredData @graph (Product+Breadcrumb) */}
				<PageHeader
					title={product.title}
					breadcrumbs={breadcrumbs}
					className="hidden sm:block"
					accent="underline"
					noStructuredData
				/>

				{/* Contenu principal */}
				<div className="bg-background pt-20 pb-6 sm:pt-4 sm:pb-12 lg:pt-6 lg:pb-16">
					<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
						<article id="product-main" className="space-y-12">
							{/* Section principale - Galerie fixe et Informations scrollables */}
							{/* group/product-details permet aux enfants de réagir au data-pending des sélecteurs */}
							<Suspense fallback={<ProductMainSkeleton />}>
								<div className="group/product-details grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
									{/* Galerie sticky sur desktop uniquement - avec hauteur max sécurisée */}
									<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit lg:max-h-[calc(100dvh-6rem)] lg:overflow-hidden">
										<Gallery product={product} title={product.title} />
									</section>

									{/* Informations et configurateur scrollables */}
									<section className="space-y-6 lg:min-h-dvh">
										{/* 1. ProductInfo - Badges, wishlist (pattern Etsy : contexte rapide) */}
										<ProductInfo product={product} isInWishlist={isInWishlist} />

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
							</Suspense>

							{/* Sticky add-to-cart desktop (apparaît quand le CTA principal sort du viewport) */}
							<StickyCartCTADesktop product={product} defaultSku={selectedSku} />

							{/* Separator avant produits recemment vus */}
							<Separator className="bg-border" />

							{/* 7. RecentlyViewedProducts - Produits recemment consultes */}
							<Suspense fallback={<RecentlyViewedProductsSkeleton limit={4} />}>
								<RecentlyViewedProducts currentProductSlug={product.slug} limit={4} />
							</Suspense>

							{/* Separator avant produits similaires */}
							<Separator className="bg-border" />

							{/* 8. RelatedProducts - Produits similaires (algorithme contextuel intelligent) */}
							<Suspense fallback={<RelatedProductsSkeleton limit={4} />}>
								<RelatedProducts currentProductSlug={product.slug} limit={4} />
							</Suspense>
						</article>
					</div>
				</div>
			</div>
		</div>
	);
}

// Export de la fonction generateMetadata depuis le fichier utilitaire
export { generateProductMetadata as generateMetadata };
