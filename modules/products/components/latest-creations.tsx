import { Stagger } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import {
	getPrimaryImageForList,
	getPrimaryPriceForList,
	getStockInfoForList,
} from "@/modules/products/utils/product-list-helpers";
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

				<Stagger
					className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-8 lg:mb-12"
					stagger={0.1}
					y={40}
					inView
					once={true}
				>
					{products.map((product, index) => {
						const { price } = getPrimaryPriceForList(product);
						const stockInfo = getStockInfoForList(product);
						const primaryImage = getPrimaryImageForList(product);

						return (
							<ProductCard
								key={product.id}
								slug={product.slug}
								title={product.title}
								description={product.description}
								price={price}
								stockStatus={stockInfo.status}
								stockMessage={stockInfo.message}
								primaryImage={{
									url: primaryImage.url,
									alt: primaryImage.alt || null,
									mediaType: primaryImage.mediaType,
								}}
								index={index}
							/>
						);
					})}
				</Stagger>

				<div className="text-center">
					<Button
						asChild
						size="lg"
						className="shadow-lg transition-all duration-300 ease-out active:scale-[0.98]"
						aria-describedby="latest-creations-cta-description"
					>
						<Link href="/produits?filter_sortBy=created-descending">
							Découvrir toutes mes créations
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
