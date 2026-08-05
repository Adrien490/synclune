import { ProductCard } from "@/modules/products/components/product-card";
import { getRecentProducts } from "../data/get-recent-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { Reveal, Stagger } from "@/shared/components/animations";
import { Separator } from "@/shared/components/ui/separator";

interface RecentlyViewedProductsProps {
	/** Slug du produit actuel (a exclure de l'affichage) */
	currentProductSlug: string;
	/** Nombre de produits a afficher */
	limit?: number;
}

/**
 * Section "Recemment vus" sur les pages produit
 *
 * Affiche les produits récemment consultés par l'utilisateur,
 * stockés dans un cookie côté serveur.
 *
 * ⚠️ **Le séparateur qui précède la section vit ICI, pas dans `page.tsx`.**
 * Il y était rendu inconditionnellement alors que cette section retourne `null`
 * dès que le cookie est vide (première fiche de chaque visite) : les deux filets
 * de la page devenaient alors frères adjacents, à 48 px l'un de l'autre, avec
 * rien entre eux. Un filet qui n'appartient pas à sa section ne peut pas
 * disparaître avec elle. Le squelette porte le même filet, sinon le swap décale.
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
	]);

	// Ne rien afficher si pas de produits récemment vus — séparateur compris.
	if (recentProducts.length === 0) {
		return null;
	}

	return (
		<>
			<Separator className="bg-border" />
			<aside className="space-y-6" aria-labelledby="recently-viewed-heading">
				{/* En-tete de section avec animation reveal */}
				<Reveal y={20} amount={0.3}>
					<div className="space-y-2">
						<h2 id="recently-viewed-heading" className="text-2xl font-semibold tracking-tight">
							Récemment vus
						</h2>
					</div>
				</Reveal>

				{/* Grille de produits avec animation stagger au scroll */}
				<Stagger
					className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
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
							sectionId="recent"
							disablePreload
						/>
					))}
				</Stagger>
			</aside>
		</>
	);
}
