import { ProductCard } from "@/modules/products/components/product-card";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { FALLBACK_IMAGE_URL } from "@/modules/medias/constants/product-fallback-image";
import { Reveal, Stagger } from "@/shared/components/animations";

interface RelatedProductsProps {
	/** Slug du produit actuel (à exclure des recommandations) */
	currentProductSlug: string;
	/** Nombre de produits similaires à afficher */
	limit?: number;
}

/**
 * Section "Produits similaires" / "Tu aimeras aussi"
 *
 * Affiche des produits similaires intelligents basés sur un algorithme contextuel :
 * 1. Même collection (priorité 1) - 3 produits
 * 2. Même type (priorité 2) - 2 produits
 * 3. Couleurs similaires (priorité 3) - 2 produits
 * 4. Best-sellers (fallback) - Compléter jusqu'à 8
 *
 * Utilise getRelatedProducts avec algorithme contextuel pour maximiser la pertinence
 *
 * @example
 * ```tsx
 * <RelatedProducts currentProductSlug="boucles-oreilles-rose" limit={8} />
 * ```
 */
export async function RelatedProducts({
	currentProductSlug,
	limit = 8,
}: RelatedProductsProps) {
	// Récupérer les produits similaires avec algorithme contextuel
	// Le filtre du produit actuel est géré dans l'algo, pas besoin de +1
	const relatedProducts = await getRelatedProducts({
		currentProductSlug,
		limit,
	});

	// Ne rien afficher si pas de produits similaires
	if (relatedProducts.length === 0) {
		return null;
	}

	return (
		<aside className="space-y-6" aria-labelledby="related-products-heading">
			{/* En-tête de section avec animation reveal */}
			<Reveal y={20} amount={0.3}>
				<div className="space-y-2">
					<h2
						id="related-products-heading"
						className="text-2xl font-semibold tracking-tight"
					>
						Tu aimeras aussi
					</h2>
					<p className="text-sm leading-normal text-muted-foreground">
						D'autres créations sélectionnées pour toi
					</p>
				</div>
			</Reveal>

			{/* Grille de produits avec animation stagger au scroll */}
			<Stagger
				className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
				inView
				stagger={0.08}
				y={30}
				amount={0.1}
			>
				{relatedProducts.map((product, index) => {
					// ✅ SIMPLE : product.skus[0] = SKU principal (déjà trié)
					const primarySku = product.skus[0];
					const primaryImage = primarySku?.images[0];
					const totalStock = product.skus.reduce(
						(sum, s) => sum + s.inventory,
						0
					);

					return (
						<ProductCard
							key={product.id}
							id={product.id}
							slug={product.slug}
							title={product.title}
							description={product.description}
							price={primarySku?.priceInclTax || 0}
							stockStatus={totalStock === 0 ? "out_of_stock" : "in_stock"}
							stockMessage={totalStock === 0 ? "Rupture de stock" : "En stock"}
							primaryImage={{
								url: primaryImage?.url || FALLBACK_IMAGE_URL,
								alt: primaryImage?.altText ?? null,
								mediaType: "IMAGE" as const,
							}}
							showDescription={false}
							size="md"
							index={index}
						/>
					);
				})}
			</Stagger>

			{/* CTA pour voir plus de produits */}
			{relatedProducts.length >= limit && (
				<div className="flex justify-center pt-4">
					<a
						href="/produits"
						className="inline-flex items-center gap-2 text-sm font-medium text-foreground hover:underline underline-offset-4 transition-all duration-200 hover:gap-3"
					>
						Découvrir toutes les créations
						<span className="text-xs">→</span>
					</a>
				</div>
			)}
		</aside>
	);
}
