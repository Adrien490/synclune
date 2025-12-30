import { CollectionCard } from "@/modules/collections/components/collection-card";
import { COLLECTION_IMAGE_SIZES } from "@/modules/collections/constants/image-sizes.constants";
import { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { Fade, Reveal } from "@/shared/components/animations";
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
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { Heart } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface CollectionsProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
}

export function Collections({ collectionsPromise }: CollectionsProps) {
	const { collections } = use(collectionsPromise);

	// Si aucune collection, ne pas afficher la section
	if (collections.length === 0) {
		return null;
	}

	const showArrows = collections.length > 3;

	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.section}`}
			aria-labelledby="collections-title"
			aria-describedby="collections-subtitle"
		>
			{/* Skip link pour navigation clavier - sauter le carousel */}
			<a
				href="#collections-cta"
				className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ring focus:text-foreground"
			>
				Passer au bouton Explorer
			</a>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="collections-title">
							Les dernières collections
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="collections-subtitle"
							className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
						>
							Je rajoute une petite touche personnelle à chaque création <Heart className="inline size-4 text-primary fill-primary" />
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
							className="w-full"
							aria-label="Carousel de collections"
						>
							<CarouselContent className="-ml-4 sm:-ml-6 py-4" showFade>
								{collections.map((collection, index) => {
									// Extraire les images des 4 premiers produits pour le Bento Grid
									const images = collection.products
										.map((p) => p.product?.skus?.[0]?.images?.[0])
										.filter(Boolean)
										.map((img) => ({
											url: img!.url,
											blurDataUrl: img!.blurDataUrl,
											alt: img!.altText,
										}));

									return (
										<CarouselItem
											key={collection.id}
											className="pl-4 sm:pl-6 basis-[clamp(200px,72vw,280px)] md:basis-1/3 lg:basis-1/4"
										>
											<CollectionCard
												slug={collection.slug}
												name={collection.name}
												description={collection.description}
												images={images}
												index={index}
												sizes={COLLECTION_IMAGE_SIZES.COLLECTION_CAROUSEL}
											/>
										</CarouselItem>
									);
								})}
							</CarouselContent>

							{/* Flèches de navigation - Desktop uniquement */}
							{showArrows && (
								<>
									<CarouselPrevious
										className="hidden md:flex left-4 top-[40%]"
										aria-label="Voir les collections précédentes"
									/>
									<CarouselNext
										className="hidden md:flex right-4 top-[40%]"
										aria-label="Voir les collections suivantes"
									/>
								</>
							)}

							{/* Dots - Mobile uniquement */}
							<CarouselDots className="md:hidden" />
						</Carousel>
					</Reveal>
				</div>

				<div id="collections-cta">
					<Fade y={15} delay={0.3} duration={0.5} inView once className="text-center">
					<Button
						asChild
						size="lg"
						className="shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out"
						aria-describedby="collections-cta-description"
					>
						<Link href="/collections">
							Explorer les collections
						</Link>
					</Button>
					<span id="collections-cta-description" className="sr-only">
						Découvrir toutes les collections
					</span>
					</Fade>
				</div>
			</div>
		</section>
	);
}
