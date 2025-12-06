import { ProductCard } from "@/modules/products/components/product-card";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { getPrimarySkuForList } from "@/modules/products/services/product-list-helpers";
import { getWishlistSkuIds } from "@/modules/wishlist/data/get-wishlist-sku-ids";
import { Reveal, Stagger } from "@/shared/components/animations";
import { Separator } from "@/shared/components/ui/separator";

interface CartRecommendationsProps {
	/** Nombre de produits à afficher */
	limit?: number;
}

/**
 * Section "Tu pourrais aimer" pour la page panier
 *
 * Utilise le même algorithme que RelatedProducts mais sans produit courant,
 * ce qui retourne :
 * - Pour les utilisateurs connectés : recommandations basées sur leur historique d'achat
 * - Pour les visiteurs : les nouveautés
 *
 * @example
 * ```tsx
 * <Suspense fallback={<CartRecommendationsSkeleton />}>
 *   <CartRecommendations limit={4} />
 * </Suspense>
 * ```
 */
export async function CartRecommendations({
	limit = 4,
}: CartRecommendationsProps) {
	// Récupérer les recommandations et les SKU IDs wishlist en parallèle
	const [recommendations, wishlistSkuIds] = await Promise.all([
		getRelatedProducts({ limit }),
		getWishlistSkuIds(),
	]);

	// Ne rien afficher si pas de recommandations
	if (recommendations.length === 0) {
		return null;
	}

	return (
		<aside className="mt-8 lg:mt-12" aria-labelledby="cart-recommendations-heading">
			<Separator className="mb-8 lg:mb-12" />

			{/* En-tête de section avec animation reveal */}
			<Reveal y={20} amount={0.3}>
				<div className="space-y-2 mb-6">
					<h2
						id="cart-recommendations-heading"
						className="text-xl sm:text-2xl font-semibold tracking-tight"
					>
						Tu pourrais aimer
					</h2>
					<p className="text-sm leading-normal text-muted-foreground">
						Des créations sélectionnées pour compléter ta commande
					</p>
				</div>
			</Reveal>

			{/* Grille de produits avec animation stagger au scroll */}
			<Stagger
				className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
				inView
				stagger={0.08}
				y={30}
				amount={0.1}
			>
				{recommendations.map((product, index) => {
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
		</aside>
	);
}

/**
 * Skeleton pour CartRecommendations
 */
export function CartRecommendationsSkeleton({ limit = 4 }: { limit?: number }) {
	return (
		<aside className="mt-8 lg:mt-12" aria-label="Chargement des recommandations">
			<div className="h-px bg-border mb-8 lg:mb-12" />

			{/* En-tête */}
			<div className="space-y-2 mb-6">
				<div className="h-7 w-48 bg-muted animate-pulse rounded" />
				<div className="h-5 w-72 max-w-full bg-muted animate-pulse rounded" />
			</div>

			{/* Grille */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
				{[...Array(limit)].map((_, index) => (
					<div key={index} className="bg-card rounded-lg shadow-sm overflow-hidden">
						<div className="aspect-[4/5] bg-muted animate-pulse" />
						<div className="p-3 space-y-2">
							<div className="h-5 bg-muted animate-pulse rounded" />
							<div className="h-4 w-16 bg-muted animate-pulse rounded" />
						</div>
					</div>
				))}
			</div>
		</aside>
	);
}
