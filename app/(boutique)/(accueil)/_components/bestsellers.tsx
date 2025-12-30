import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import { Fade, Stagger } from "@/shared/components/animations";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import Link from "next/link";
import { use } from "react";

interface BestsellersProps {
	productsPromise: Promise<GetProductsReturn>;
	wishlistProductIdsPromise: Promise<Set<string>>;
}

/**
 * Section Meilleures Ventes - Affiche les produits les plus vendus
 *
 * Pattern : Server Component qui accepte une Promise pour le streaming
 * Permet le rendu progressif avec React Suspense
 *
 * Met en avant les bestsellers pour :
 * - Creer de la preuve sociale (ces bijoux sont populaires)
 * - Guider les visiteurs vers les produits eprouves
 * - Augmenter la conversion via l'effet "bandwagon"
 *
 * Note: Si aucune vente dans les 30 derniers jours, la section est masquee
 *
 * @param productsPromise - Promise contenant les produits les plus vendus
 */
export function Bestsellers({ productsPromise, wishlistProductIdsPromise }: BestsellersProps) {
	const { products } = use(productsPromise);
	const wishlistProductIds = use(wishlistProductIdsPromise);

	// Si aucun bestseller, ne pas afficher la section
	if (products.length === 0) {
		return null;
	}

	return (
		<section
			id="bestsellers"
			className={`relative overflow-hidden ${SECTION_SPACING.section}`}
			aria-labelledby="bestsellers-title"
			aria-describedby="bestsellers-subtitle"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Baymard UX: Full scope label - "Bijoux les plus vendus" au lieu de "Meilleures ventes" */}
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<div className="flex items-center justify-center gap-2 mb-2">
							<SectionTitle id="bestsellers-title">
								Bijoux les plus vendus
							</SectionTitle>
						</div>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="bestsellers-subtitle"
							className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto"
						>
							Les créations les plus appréciées par mes clientes
						</p>
					</Fade>
				</header>

					<Stagger
					className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12"
					role="list"
					aria-label="Liste des meilleures ventes"
					stagger={0.08}
					y={25}
					inView
					once={true}
				>
					{products.map((product, index) => (
						<ProductCard
							key={product.id}
							product={product}
							index={index}
							isInWishlist={wishlistProductIds.has(product.id)}
							sectionId="bestsellers"
						/>
					))}
				</Stagger>

				{/* Baymard UX: Featured products → Category link (43% des sites oublient) */}
				<Fade y={15} delay={0.3} duration={0.5} inView once className="text-center">
					<Button
						asChild
						size="lg"
						className="shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
						aria-describedby="bestsellers-cta-description"
					>
						<Link href="/produits?sortBy=best-selling">
							Voir tous les best-sellers
						</Link>
					</Button>
					<span id="bestsellers-cta-description" className="sr-only">
						Voir la liste complète des bijoux les plus vendus
					</span>
				</Fade>
			</div>
		</section>
	);
}
