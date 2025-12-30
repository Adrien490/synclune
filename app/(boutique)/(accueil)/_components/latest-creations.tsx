import { Fade, Reveal } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/shared/components/ui/carousel";
import { SectionTitle } from "@/shared/components/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { ProductCard } from "@/modules/products/components/product-card";
import { GetProductsReturn } from "@/modules/products/data/get-products";
import Link from "next/link";
import { use } from "react";

interface LatestCreationsProps {
	productsPromise: Promise<GetProductsReturn>;
	wishlistProductIdsPromise: Promise<Set<string>>;
}

/**
 * Section Dernières Créations - Carousel des bijoux les plus récents
 *
 * Pattern : Server Component qui accepte une Promise pour le streaming
 * Permet le rendu progressif avec React Suspense
 *
 * Le carousel evoque un flux continu de nouvelles creations, renforce
 * l'image d'un atelier actif et encourage l'exploration
 *
 * @param productsPromise - Promise contenant les produits récents
 */
export function LatestCreations({ productsPromise, wishlistProductIdsPromise }: LatestCreationsProps) {
	const { products } = use(productsPromise);
	const wishlistProductIds = use(wishlistProductIdsPromise);

	// Si aucun produit, ne pas afficher la section
	if (products.length === 0) {
		return null;
	}

	const showArrows = products.length > 4;

	return (
		<section
			id="latest-creations"
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-labelledby="latest-creations-title"
			aria-describedby="latest-creations-subtitle"
		>
			{/* Skip link pour navigation clavier - sauter le carousel */}
			<a
				href="#latest-creations-cta"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring focus:text-foreground"
			>
				Passer au bouton Voir toutes mes créations
			</a>

			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				{/* Baymard UX: Full scope labels - "Nouveaux bijoux" au lieu de "Nouveautés" */}
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="latest-creations-title">
							Nouveaux bijoux
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="latest-creations-subtitle"
							className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
						>
							Tout juste sortis de l'atelier
						</p>
					</Fade>
				</header>

				<div className="mb-8 lg:mb-12">
					<Reveal delay={0.2} duration={0.8} y={20} once={true}>
						<Carousel
							opts={{
								align: "start",
								containScroll: "trimSnaps",
							}}
							className="w-full"
							aria-label="Carousel des dernières créations"
						>
							<CarouselContent className="-ml-3 sm:-ml-4 lg:-ml-6 py-4" showFade>
								{products.map((product, index) => (
									<CarouselItem
										key={product.id}
										className="pl-3 sm:pl-4 lg:pl-6 basis-[clamp(160px,45vw,200px)] sm:basis-1/3 lg:basis-1/4"
									>
										<ProductCard
											product={product}
											index={index}
											isInWishlist={wishlistProductIds.has(product.id)}
											sectionId="latest"
										/>
									</CarouselItem>
								))}
							</CarouselContent>

							{/* Flèches de navigation - Desktop uniquement */}
							{showArrows && (
								<>
									<CarouselPrevious
										className="hidden md:flex left-4 top-[40%]"
										aria-label="Voir les créations précédentes"
									/>
									<CarouselNext
										className="hidden md:flex right-4 top-[40%]"
										aria-label="Voir les créations suivantes"
									/>
								</>
							)}

							{/* Dots - Mobile uniquement */}
							<CarouselDots className="md:hidden" />
						</Carousel>
					</Reveal>
				</div>

				<div id="latest-creations-cta">
					<Fade y={15} delay={0.3} duration={0.5} inView once className="text-center">
					<Button
						asChild
						size="lg"
						className="shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
						aria-describedby="latest-creations-cta-description"
					>
						<Link href="/produits?sortBy=created-descending">
							Voir tous les nouveaux bijoux
						</Link>
					</Button>
					<span id="latest-creations-cta-description" className="sr-only">
						Découvrir tous les bijoux récemment créés dans la boutique Synclune
					</span>
					</Fade>
				</div>
			</div>
		</section>
	);
}
