import Link from "next/link";
import { ProductCard } from "@/modules/products/components/product-card";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { Reveal, Stagger } from "@/shared/components/animations";
import { Separator } from "@/shared/components/ui/separator";

interface CartRecommendationsProps {
	/** Nombre de produits à afficher */
	limit?: number;
}

/**
 * Section "Vous pourriez aimer" pour la page panier
 *
 * Utilise le même algorithme que RelatedProducts mais sans produit courant,
 * ce qui retourne :
 * - Pour les utilisateurs connectés : recommandations basées sur leur historique d'achat
 * - Pour les visiteurs : les nouveautés
 *
 * @example
 * ```tsx
 * import { CartRecommendationsSkeleton } from "./cart-recommendations-skeleton";
 *
 * <Suspense fallback={<CartRecommendationsSkeleton />}>
 *   <CartRecommendations limit={4} />
 * </Suspense>
 * ```
 */
export async function CartRecommendations({ limit = 4 }: CartRecommendationsProps) {
	const [recommendations, wishlistProductIds] = await Promise.all([
		getRelatedProducts({ limit }),
		getWishlistProductIds(),
	]);

	if (recommendations.length === 0) {
		return null;
	}

	return (
		<aside className="mt-8 lg:mt-12" aria-labelledby="cart-recommendations-heading">
			<Separator className="mb-8 lg:mb-12" />

			<Reveal y={20}>
				<div className="mb-6 space-y-2">
					<h2
						id="cart-recommendations-heading"
						className="text-2xl font-semibold tracking-tight text-balance"
					>
						Vous pourriez aimer
					</h2>
					<p className="text-muted-foreground text-sm leading-normal text-balance">
						Des créations sélectionnées pour compléter votre commande
					</p>
				</div>
			</Reveal>

			<Stagger
				className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4"
				inView
				y={30}
			>
				{recommendations.map((product) => (
					<ProductCard
						key={product.id}
						product={product}
						isInWishlist={wishlistProductIds.has(product.id)}
						sectionId="cart-reco"
						disablePreload
					/>
				))}
			</Stagger>

			{recommendations.length >= limit && (
				<div className="flex justify-center pt-8 lg:pt-10">
					<Link
						href="/produits"
						className="text-foreground inline-flex items-center gap-2 text-sm font-medium underline-offset-4 transition-all duration-200 hover:gap-3 hover:underline"
					>
						Découvrir toutes les créations
						<span className="text-xs">→</span>
					</Link>
				</div>
			)}
		</aside>
	);
}
