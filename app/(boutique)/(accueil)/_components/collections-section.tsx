import { CollectionCard } from "@/modules/collections/components/collection-card";
import { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { extractCollectionImages, extractPriceRange } from "@/modules/collections/utils/collection-images.utils";
import { Fade, HandDrawnUnderline, Reveal } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { SectionTitle } from "@/shared/components/section-title";
import { Button } from "@/shared/components/ui/button";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/shared/components/ui/carousel";
import { CONTAINER_CLASS, SECTION_SPACING } from "@/shared/constants/spacing";
import { Heart } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface CollectionsSectionProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
}

export function CollectionsSection({ collectionsPromise }: CollectionsSectionProps) {
	const { collections } = use(collectionsPromise);

	// Don't render section with no collections
	if (collections.length === 0) {
		return null;
	}

	const showArrows = collections.length > 3;

	return (
		<section
			id="collections"
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-labelledby="collections-title"
			aria-describedby="collections-subtitle"
		>
			{/* Skip link for keyboard navigation - skip carousel */}
			<a
				href="#collections-cta"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring focus:text-foreground"
			>
				Passer au bouton Explorer
			</a>
			<div className={`relative ${CONTAINER_CLASS}`}>
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="collections-title">
							Les dernières collections
						</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.3} className="mx-auto mt-2" />
					</Fade>
					<Fade y={MOTION_CONFIG.section.subtitle.y} delay={MOTION_CONFIG.section.subtitle.delay} duration={MOTION_CONFIG.section.subtitle.duration}>
						<p
							id="collections-subtitle"
							className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
						>
							Je rajoute une petite touche personnelle à chaque création <Heart className="inline size-4 text-primary fill-primary" aria-hidden="true" /><span className="sr-only"> avec amour</span>
						</p>
					</Fade>
				</header>

				<div className="mb-8 lg:mb-12">
					<Reveal delay={0.2} duration={0.8} y={20} once={true}>
						<Carousel
							opts={{
								align: "center",
								containScroll: "trimSnaps",
							}}
							className="w-full group/carousel"
							aria-label="Carousel de collections"
						>
							<CarouselContent className="-ml-4 sm:-ml-6 py-4" showFade>
								{collections.map((collection, index) => {
									const images = extractCollectionImages(collection.products);

									return (
										<CarouselItem
											key={collection.id}
											index={index}
											className="pl-4 sm:pl-6 basis-[clamp(200px,72vw,280px)] md:basis-1/3 lg:basis-1/4"
										>
											<CollectionCard
												slug={collection.slug}
												name={collection.name}
												images={images}
												index={index}
												productCount={collection._count.products}
												description={collection.description}
												priceRange={extractPriceRange(collection.products)}
											/>
										</CarouselItem>
									);
								})}
							</CarouselContent>

							{/* Navigation arrows - Desktop only */}
							{showArrows && (
								<>
									<CarouselPrevious
										className="hidden md:flex left-4 top-[40%] opacity-80 group-hover/carousel:opacity-100 transition-opacity duration-300"
										aria-label="Voir les collections précédentes"
									/>
									<CarouselNext
										className="hidden md:flex right-4 top-[40%] opacity-80 group-hover/carousel:opacity-100 transition-opacity duration-300"
										aria-label="Voir les collections suivantes"
									/>
								</>
							)}

							{/* Dots - Mobile only */}
							<CarouselDots className="md:hidden" />
						</Carousel>
					</Reveal>
				</div>

				<div id="collections-cta">
					<Fade y={MOTION_CONFIG.section.cta.y} delay={MOTION_CONFIG.section.cta.delay} duration={MOTION_CONFIG.section.cta.duration} inView once className="text-center">
					<Button
						asChild
						size="lg"
						variant="outline"
						className="hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
					>
						<Link href="/collections">
							Explorer les collections
						</Link>
					</Button>
					</Fade>
				</div>
			</div>
		</section>
	);
}
