import { Stagger } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { getPrimarySkuForList } from "@/modules/products/services/product-list-helpers";
import { getWishlistSkuIds } from "@/modules/wishlist/data/get-wishlist-sku-ids";
import { cn } from "@/shared/utils/cn";
import Link from "next/link";
import { use } from "react";

interface LatestCreationsProps {
	productsPromise: Promise<GetProductsReturn>;
}

/**
 * Section Dernières Créations - Affiche les bijoux les plus récents
 *
 * Pattern : Server Component qui accepte une Promise pour le streaming
 * Permet le rendu progressif avec React Suspense
 *
 * Met en avant les créations les plus récentes de l'atelier pour :
 * - Créer un sentiment d'urgence et de nouveauté
 * - Montrer que la boutique est active
 * - Encourager les visiteurs réguliers à revenir
 *
 * @param productsPromise - Promise contenant les produits récents
 *
 * @example
 * ```tsx
 * // Dans une page Server Component
 * import { getProducts } from "@/modules/products/data/get-products";
 *
 * export default function HomePage() {
 *   const latestProductsPromise = getProducts({
 *     perPage: 4,
 *     sortBy: "created-descending",
 *     filters: { status: "PUBLIC" }
 *   });
 *   return <LatestCreations productsPromise={latestProductsPromise} />;
 * }
 * ```
 */
export function LatestCreations({ productsPromise }: LatestCreationsProps) {
	const { products } = use(productsPromise);
	const wishlistSkuIds = use(getWishlistSkuIds());

	// Si aucun produit, ne pas afficher la section
	if (products.length === 0) {
		return null;
	}

	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
			aria-labelledby="latest-creations-title"
			aria-describedby="latest-creations-subtitle"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="mb-8 text-center lg:mb-12">
					<div className="flex items-center justify-center gap-2 mb-2">
						<SectionTitle id="latest-creations-title">
							Nouveautés de l'atelier
						</SectionTitle>
					</div>
					<p
						id="latest-creations-subtitle"
						className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto"
					>
						Mes tout nouveaux bijoux, juste sortis de l'atelier ! 5 à 10 pièces
						maximum par modèle.
					</p>
				</header>

				{/* Grille unifiée : 6 produits mobile, tous desktop (évite double rendering DOM) */}
				<Stagger
					className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12"
					stagger={0.08}
					y={30}
					inView
					once={true}
				>
					{products.map((product, index) => {
						const primarySku = getPrimarySkuForList(product);
						return (
							<div
								key={product.id}
								className={cn(
									// Cacher produits 7-12 sur mobile (< sm breakpoint)
									index >= 6 && "hidden sm:block"
								)}
							>
								<ProductCard
									product={product}
									index={index}
									isInWishlist={!!primarySku?.id && wishlistSkuIds.has(primarySku.id)}
								/>
							</div>
						);
					})}
				</Stagger>

				<div className="text-center space-y-3">
					{/* Indication mobile : nombre de produits non affichés */}
					{products.length > 6 && (
						<p className="sm:hidden text-sm text-muted-foreground">
							+ {products.length - 6} autres créations à découvrir
						</p>
					)}
					<Button
						asChild
						size="lg"
						className="shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
						aria-describedby="latest-creations-cta-description"
					>
						<Link href="/produits?filter_sortBy=created-descending">
							Voir toutes mes créations
						</Link>
					</Button>
					<span id="latest-creations-cta-description" className="sr-only">
						Voir tous mes bijoux récemment créés dans la boutique Synclune
					</span>
				</div>
			</div>
		</section>
	);
}
