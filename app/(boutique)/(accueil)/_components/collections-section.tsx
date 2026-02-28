import { CollectionCard } from "@/modules/collections/components/collection-card";
import { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import {
	extractCollectionImages,
	extractPriceRange,
} from "@/modules/collections/utils/collection-images.utils";
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
			className={`bg-background relative overflow-hidden ${SECTION_SPACING.section}`}
			aria-labelledby="collections-title"
			aria-describedby="collections-subtitle"
		>
			{/* Skip link for keyboard navigation - skip carousel */}
			<a
				href="#collections-cta"
				className="focus:bg-background focus:ring-ring focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:px-4 focus:py-2 focus:ring-2"
			>
				Passer au bouton Explorer
			</a>
			<div className={`relative ${CONTAINER_CLASS}`}>
				<header className="mb-10 text-center lg:mb-14">
					<Fade y={MOTION_CONFIG.section.title.y} duration={MOTION_CONFIG.section.title.duration}>
						<SectionTitle id="collections-title">Les dernières collections</SectionTitle>
						<HandDrawnUnderline color="var(--secondary)" delay={0.15} className="mx-auto mt-2" />
					</Fade>
					<Fade
						y={MOTION_CONFIG.section.subtitle.y}
						delay={MOTION_CONFIG.section.subtitle.delay}
						duration={MOTION_CONFIG.section.subtitle.duration}
					>
						<p
							id="collections-subtitle"
							className="text-muted-foreground mx-auto mt-5 max-w-2xl text-lg/8 tracking-normal"
						>
							Je rajoute une petite touche personnelle à chaque création{" "}
							<Heart className="text-primary fill-primary inline size-4" aria-hidden="true" />
							<span className="sr-only"> avec amour</span>
						</p>
					</Fade>
				</header>

				<div className="mb-8 lg:mb-12">
					<Reveal
						y={MOTION_CONFIG.section.carousel.y}
						delay={MOTION_CONFIG.section.carousel.delay}
						duration={MOTION_CONFIG.section.carousel.duration}
						once
					>
						<Carousel
							opts={{
								align: "center",
								containScroll: "trimSnaps",
							}}
							className="group/carousel w-full"
							aria-label="Carrousel de collections"
						>
							<CarouselContent className="-ml-4 py-4 sm:-ml-6" showFade>
								{collections.map((collection, index) => {
									const images = extractCollectionImages(collection.products);

									return (
										<CarouselItem
											key={collection.id}
											index={index}
											className="basis-[clamp(200px,72vw,280px)] pl-4 sm:pl-6 md:basis-1/3 lg:basis-1/4"
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
										className="top-[40%] left-4 hidden opacity-80 transition-opacity duration-300 group-hover/carousel:opacity-100 md:flex"
										aria-label="Voir les collections précédentes"
									/>
									<CarouselNext
										className="top-[40%] right-4 hidden opacity-80 transition-opacity duration-300 group-hover/carousel:opacity-100 md:flex"
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
					<Fade
						y={MOTION_CONFIG.section.cta.y}
						delay={MOTION_CONFIG.section.cta.delay}
						duration={MOTION_CONFIG.section.cta.duration}
						inView
						once
						className="text-center"
					>
						<Button
							asChild
							size="lg"
							variant="outline"
							className="transition-[transform,box-shadow] duration-300 ease-out hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
						>
							<Link href="/collections">Explorer les collections</Link>
						</Button>
					</Fade>
				</div>
			</div>
		</section>
	);
}
