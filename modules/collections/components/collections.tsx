import { Fade, Reveal } from "@/shared/components/animations";
import { Button } from "@/shared/components/ui/button";
import { SectionTitle } from "@/shared/components/ui/section-title";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { GetCollectionsReturn } from "@/modules/collections/data/get-collections";
import { Palette } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { CollectionCard } from "./collection-card";
import { CollectionCarouselWrapper } from "./collection-carousel-wrapper";

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
			className={`relative overflow-hidden bg-gradient-to-b from-pink-50/30 via-background to-background ${SECTION_SPACING.default}`}
			aria-labelledby="collections-title"
			aria-describedby="collections-subtitle"
		>
			<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<header className="mb-8 text-center lg:mb-12">
					<Fade y={20} duration={0.6}>
						<SectionTitle id="collections-title">
							Dernières collections
						</SectionTitle>
					</Fade>
					<Fade y={10} delay={0.1} duration={0.6}>
						<p
							id="collections-subtitle"
							className="mt-4 text-lg/7 tracking-normal antialiased text-muted-foreground max-w-2xl mx-auto"
						>
							Chaque collection raconte une histoire différente. Des couleurs, des thèmes... J'adore créer ces petits univers !
						</p>
					</Fade>
				</header>

				<div className="mb-8 lg:mb-12">
					<CollectionCarouselWrapper showArrows={collections.length > 3}>
						<Reveal
							delay={0.2}
							duration={0.8}
							y={20}
							once={true}
							className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mask-l-from-95% mask-r-from-95%"
							data-carousel-scroll
						>
							<div role="list" className="flex gap-4 sm:gap-6">
							{collections.map((collection, index) => (
								<div
									key={collection.id}
									className={`shrink-0 w-[280px] snap-center ${
										index === 0 ? "ml-[calc(50vw-140px)] sm:ml-6 lg:ml-8" : ""
									} ${
										index === collections.length - 1
											? "mr-[calc(50vw-140px)] sm:mr-6 lg:mr-8"
											: ""
									}`}
									role="listitem"
								>
									<CollectionCard
										slug={collection.slug}
										name={collection.name}
										description={collection.description}
										imageUrl={collection.products[0]?.product?.skus[0]?.images[0]?.url || null}
										showDescription={false}
									/>
								</div>
							))}
							</div>
						</Reveal>
					</CollectionCarouselWrapper>
				</div>

				<div className="text-center">
					<Button
						asChild
						size="lg"
						className="shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out group"
						aria-describedby="collections-cta-description"
					>
						<Link href="/collections" className="flex items-center gap-2">
							<Palette
								size={18}
								className="group-hover:rotate-12 transition-transform duration-300"
								aria-hidden="true"
							/>
							Explorer mes univers
						</Link>
					</Button>
					<span id="collections-cta-description" className="sr-only">
						Découvrir toutes les collections de bijoux Synclune
					</span>
				</div>
			</div>
		</section>
	);
}
