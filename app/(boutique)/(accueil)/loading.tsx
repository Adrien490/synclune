import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { AtelierStorySkeleton } from "./_components/atelier-story-skeleton";
import { CreativeProcessSkeleton } from "./_components/creative-process-skeleton";
import { CuratedPicksSkeleton } from "./_components/curated-picks-skeleton";
import { FaqSectionSkeleton } from "./_components/faq-section-skeleton";
import { HeroSectionSkeleton } from "./_components/hero-section-skeleton";
import { LatestCreationsSkeleton } from "./_components/latest-creations-skeleton";

/**
 * Loading state for home page
 * Reproduit EXACTEMENT la structure de la page réelle pour éviter le CLS
 *
 * Structure : Hero → ValueProposition → CuratedPicks → LatestCreations
 *           → Collections → AtelierStory → CreativeProcess → FAQ → Newsletter
 */
export default function HomeLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la page d'accueil"
		>
			<span className="sr-only">Chargement en cours...</span>

			{/* 1. Hero */}
			<HeroSectionSkeleton />

			{/* 2. Value Proposition Bar */}
			<div className="py-8 sm:py-10 lg:py-12 bg-muted/30">
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
						{Array.from({ length: 4 }).map((_, i) => (
							<div key={i} className="flex flex-col items-center text-center gap-3 p-4">
								<div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-muted animate-pulse" />
								<div className="space-y-1 w-full">
									<div className="h-5 w-24 mx-auto bg-muted animate-pulse rounded" />
									<div className="h-4 w-32 mx-auto bg-muted/50 animate-pulse rounded" />
								</div>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* 3. Curated Picks */}
			<CuratedPicksSkeleton productsCount={4} />

			{/* 4. Latest Creations */}
			<LatestCreationsSkeleton productsCount={4} />

			{/* 5. Collections */}
			<CollectionsSectionSkeleton collectionsCount={6} />

			{/* 6. Atelier Story */}
			<AtelierStorySkeleton />

			{/* 7. Creative Process */}
			<CreativeProcessSkeleton />

			{/* 8. FAQ */}
			<FaqSectionSkeleton />

			{/* 9. Newsletter */}
			<div className={`relative overflow-hidden bg-muted/20 ${SECTION_SPACING.section}`}>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					<header className="mb-8 text-center lg:mb-12">
						<div className="h-10 w-48 mx-auto bg-muted animate-pulse rounded" />
						<div className="mt-4 h-7 w-full max-w-md mx-auto bg-muted/50 animate-pulse rounded" />
					</header>
					<div className="max-w-md mx-auto">
						<div className="h-12 w-full bg-muted animate-pulse rounded-md" />
						<div className="mt-3 h-10 w-full bg-muted animate-pulse rounded-md" />
					</div>
					<div className="mt-6 text-center">
						<div className="h-4 w-64 mx-auto bg-muted/50 animate-pulse rounded" />
					</div>
				</div>
			</div>
		</div>
	);
}
