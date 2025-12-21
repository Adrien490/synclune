import { ProductCard } from "@/modules/products/components/product-card";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { getWishlistSkuIds } from "@/modules/wishlist/data/get-wishlist-sku-ids";
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
						D'autres créations que tu pourrais aimer 😊
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
					className="w-full"
					aria-label="Carousel de produits similaires"
				>
					<CarouselContent className="-ml-4 sm:-ml-6 py-4" showFade>
						{relatedProducts.map((product, index) => (
							<CarouselItem
								key={product.id}
								className="pl-4 sm:pl-6 basis-[clamp(200px,72vw,280px)] md:basis-1/3 lg:basis-1/4"
							>
								<ProductCard
									product={product}
									index={index}
									wishlistSkuIds={wishlistSkuIds}
								/>
							</CarouselItem>
						))}
					</CarouselContent>

					{/* Flèches de navigation - Desktop uniquement */}
					{relatedProducts.length > 3 && (
						<>
							<CarouselPrevious
								className="hidden md:flex left-4 top-[40%]"
								aria-label="Voir les produits précédents"
							/>
							<CarouselNext
								className="hidden md:flex right-4 top-[40%]"
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
