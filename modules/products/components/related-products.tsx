import Link from "next/link";
import { ProductCard } from "@/modules/products/components/product-card";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { Reveal } from "@/shared/components/animations";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/shared/components/ui/carousel";

interface RelatedProductsProps {
	/** Slug du produit actuel (à exclure des recommandations) */
	currentProductSlug: string;
	/** Nombre de produits similaires à afficher */
	limit?: number;
}

/**
 * Section "Produits similaires" / "Vous aimerez aussi"
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
export async function RelatedProducts({ currentProductSlug, limit = 8 }: RelatedProductsProps) {
	// Récupérer les produits similaires et les Product IDs wishlist en parallèle
	const [relatedProducts, wishlistProductIds] = await Promise.all([
		getRelatedProducts({
			currentProductSlug,
			limit,
		}),
		getWishlistProductIds(),
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
					<h2 id="related-products-heading" className="text-2xl font-semibold tracking-tight">
						D'autres créations que vous pourriez aimer <span aria-hidden="true">😊</span>
					</h2>
				</div>
			</Reveal>

			{/* Carousel de produits similaires */}
			<Reveal delay={0.2} duration={0.8} y={20} once={true}>
				<Carousel
					opts={{
						align: "center",
						containScroll: "trimSnaps",
					}}
					className="group/carousel w-full"
					aria-label="Carousel de produits similaires"
				>
					<CarouselContent className="-ml-4 py-4 sm:-ml-6" showFade>
						{relatedProducts.map((product) => (
							<CarouselItem
								key={product.id}
								className="basis-[47%] pl-4 sm:basis-[clamp(200px,48vw,280px)] sm:pl-6 md:basis-1/3 lg:basis-1/4"
							>
								<ProductCard
									product={product}
									isInWishlist={wishlistProductIds.has(product.id)}
									sectionId="related"
								/>
							</CarouselItem>
						))}
					</CarouselContent>

					{/* Flèches de navigation - Desktop uniquement */}
					{relatedProducts.length > 3 && (
						<>
							<CarouselPrevious
								className="top-[40%] left-4 hidden opacity-0 transition-opacity duration-300 group-hover/carousel:opacity-100 focus-visible:opacity-100 disabled:opacity-0 md:flex"
								aria-label="Voir les produits précédents"
							/>
							<CarouselNext
								className="top-[40%] right-4 hidden opacity-0 transition-opacity duration-300 group-hover/carousel:opacity-100 focus-visible:opacity-100 disabled:opacity-0 md:flex"
								aria-label="Voir les produits suivants"
							/>
						</>
					)}

					{/* Dots - Mobile uniquement */}
					<CarouselDots className="md:hidden" />
				</Carousel>
			</Reveal>

			{/* CTA pour voir plus de produits */}
			{relatedProducts.length >= limit && (
				<div className="flex justify-center pt-4">
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
