import { Fade, Reveal } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import Link from "next/link";
import { use } from "react";
import { CollectionCard } from "../../../../modules/collections/components/collection-card";
import { CollectionCarouselWrapper } from "../../../../modules/collections/components/collection-carousel-wrapper";

interface CollectionsProps {
	collectionsPromise: Promise<GetCollectionsReturn>;
}

/**
 * Section Collections - Affiche les dernières collections de bijoux
 *
 * Pattern : Server Component qui accepte une Promise pour le streaming
 * Permet le rendu progressif avec React Suspense
 *
 * @param collectionsPromise - Promise contenant les données des collections
 *
 * @example
 * ```tsx
 * // Dans une page Server Component
 * import { getCollections } from "@/modules/collections/data/get-collections";
 *
 * export default function HomePage() {
 *   const collectionsPromise = getCollections();
 *   return <Collections collectionsPromise={collectionsPromise} />;
 * }
 * ```
 */
export function Collections({ collectionsPromise }: CollectionsProps) {
	const { collections } = use(collectionsPromise);

	// Si aucune collection, ne pas afficher la section
	if (collections.length === 0) {
		return null;
	}

	return (
		<section
			className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
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
							Collections
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="collections-subtitle"
							className="mt-4 text-lg/7 tracking-normal text-muted-foreground max-w-2xl mx-auto"
						>
							Je rajoute une petite touche personnelle à chaque création 😊
						</p>
					</Fade>
				</header>

				<div className="mb-8 lg:mb-12 -mx-4 sm:-mx-6 lg:-mx-8">
					<CollectionCarouselWrapper showArrows={collections.length > 3}>
						<Reveal
							role="list"
							delay={0.2}
							duration={0.8}
							y={20}
							once={true}
							className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mask-carousel-edges"
							data-carousel-scroll
						>
							{collections.map((collection, index) => (
								<div
									key={collection.id}
									data-index={index}
									className="shrink-0 w-[clamp(220px,75vw,280px)] snap-center"
									role="listitem"
								>
									<CollectionCard
										slug={collection.slug}
										name={collection.name}
										description={collection.description}
										imageUrl={collection.products[0]?.product?.skus[0]?.images[0]?.url || null}
										showDescription={false}
										index={index}
									/>
								</div>
							))}
						</Reveal>
					</CollectionCarouselWrapper>
				</div>

				<div id="collections-cta" className="text-center">
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
				</div>
			</div>
		</section>
	);
}
