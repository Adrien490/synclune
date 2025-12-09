import { ProductCard } from "@/modules/products/components/product-card";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { getPrimarySkuForList } from "@/modules/products/services/product-list-helpers";
import { getWishlistSkuIds } from "@/modules/wishlist/data/get-wishlist-sku-ids";
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
	// Récupérer les produits similaires et les SKU IDs wishlist en parallèle
	const [relatedProducts, wishlistSkuIds] = await Promise.all([
		getRelatedProducts({
			currentProductSlug,
			limit,
		}),
		getWishlistSkuIds(),
	]);

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
						J'espère que tu trouveras ton bonheur 😊
					</h2>
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
					const primarySku = getPrimarySkuForList(product);
					return (
						<ProductCard
							key={product.id}
							product={product}
							index={index}
							isInWishlist={!!primarySku?.id && wishlistSkuIds.has(primarySku.id)}
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
