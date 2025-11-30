import { isAdmin } from "@/modules/auth/utils/guards";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ParticleSystem } from "@/shared/components/animations/particle-system";
import { Separator } from "@/shared/components/ui/separator";
import {
	findSkuByVariants,
	filterCompatibleSkus,
	getProductBySlug,
} from "@/modules/products/data/get-product";
import { checkIsInWishlist } from "@/modules/wishlist/data/check-is-in-wishlist";

import { PageHeader } from "@/shared/components/page-header";
import { ProductDetails } from "@/modules/products/components/product-details";
import { ProductGallery } from "@/modules/medias/components/product-gallery";
import { ProductInfo } from "@/modules/products/components/product-info";

import { RelatedProducts } from "@/modules/products/components/related-products";
import { RelatedProductsSkeleton } from "@/modules/products/components/related-products-skeleton";
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

	// Paralléliser isAdmin et getProduct pour optimiser le TTFB
	const [admin, product] = await Promise.all([
		isAdmin(),
		getProductBySlug({ slug, includeDraft: true }), // Récupérer avec DRAFT, filtrer après
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
		...(product.type
			? [
					{
						label: product.type.label,
						href: `/produits/${product.type.slug}`,
					},
				]
			: []),
		{ label: product.title, href: `/creations/${product.slug}` },
	];

	// Génération du structured data JSON-LD
	const structuredData = generateStructuredData(product, selectedSku);

	// Vérifier si le SKU sélectionné est dans la wishlist de l'utilisateur
	const isInWishlist = await checkIsInWishlist(selectedSku.id);

	return (
		<div className="min-h-screen relative">
			{/* Structured Data JSON-LD pour SEO */}
			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
			/>

			{/* Particules précieuses pour pages produits - variant jewelry */}
			<ParticleSystem variant="jewelry" className="fixed inset-0 z-0" />

			<div className="relative z-10">
				<PageHeader title={product.title} breadcrumbs={breadcrumbs} />

				{/* Contenu principal */}
				<div className="bg-background py-8">
					<div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
						<article
							itemScope
							itemType="https://schema.org/Product"
							className="space-y-12"
						>
							{/* Section principale - Galerie fixe et Informations scrollables */}
							<div className="grid gap-6 lg:gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
								{/* Galerie sticky sur desktop uniquement */}
								<section className="lg:sticky lg:top-20 lg:z-10 lg:h-fit">
									<ProductGallery product={product} title={product.title} />
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
									<ProductDetails product={product} defaultSku={selectedSku} />
								</section>
							</div>

							{/* Separator avant produits similaires */}
							<Separator className="bg-border" />

							{/* 7. RelatedProducts - Produits similaires (algorithme contextuel intelligent) */}
							<Suspense fallback={<RelatedProductsSkeleton limit={8} />}>
								<RelatedProducts currentProductSlug={product.slug} limit={8} />
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
