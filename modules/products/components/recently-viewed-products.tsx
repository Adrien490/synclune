import { ProductCard } from "@/modules/products/components/product-card"
import { getRecentProducts } from "@/shared/data/get-recent-products"
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids"
import { Reveal, Stagger } from "@/shared/components/animations"

interface RecentlyViewedProductsProps {
	/** Slug du produit actuel (a exclure de l'affichage) */
	currentProductSlug: string
	/** Nombre de produits a afficher */
	limit?: number
}

/**
 * Section "Recemment vus" sur les pages produit
 *
 * Affiche les produits recemment consultes par l'utilisateur,
 * stockes dans un cookie cote serveur.
 *
 * @example
 * ```tsx
 * <Suspense fallback={<RecentlyViewedProductsSkeleton />}>
 *   <RecentlyViewedProducts currentProductSlug={product.slug} />
 * </Suspense>
 * ```
 */
export async function RecentlyViewedProducts({
	currentProductSlug,
	limit = 8,
}: RecentlyViewedProductsProps) {
	// Recuperer les produits recemment vus et les Product IDs wishlist en parallele
	const [recentProducts, wishlistProductIds] = await Promise.all([
		getRecentProducts({
			excludeSlug: currentProductSlug,
			limit,
		}),
		getWishlistProductIds(),
	])

	// Ne rien afficher si pas de produits recemment vus
	if (recentProducts.length === 0) {
		return null
	}

	return (
		<aside className="space-y-6" aria-labelledby="recently-viewed-heading">
			{/* En-tete de section avec animation reveal */}
			<Reveal y={20} amount={0.3}>
				<div className="space-y-2">
					<h2
						id="recently-viewed-heading"
						className="text-2xl font-semibold tracking-tight"
					>
						Recemment vus
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
				{recentProducts.map((product, index) => (
					<ProductCard
						key={product.id}
						product={product}
						index={index}
						isInWishlist={wishlistProductIds.has(product.id)}
					/>
				))}
			</Stagger>
		</aside>
	)
}
