import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { AtelierStorySkeleton } from "./_components/atelier-story-skeleton";
import { CreativeProcessSkeleton } from "./_components/creative-process-skeleton";
import { FaqSectionSkeleton } from "./_components/faq-section-skeleton";
import { HeroSectionSkeleton } from "./_components/hero-section-skeleton";
import { LatestCreationsSkeleton } from "./_components/latest-creations-skeleton";
import { ReviewsSectionSkeleton } from "./_components/reviews-section-skeleton";

/**
 * Loading state for home page
 * Reproduit EXACTEMENT la structure de la page réelle pour éviter le CLS
 *
 * Structure : Hero → LatestCreations → Collections → Reviews
 *           → AtelierStory → CreativeProcess → FAQ → Newsletter
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

			{/* 2. Latest Creations */}
			<LatestCreationsSkeleton productsCount={4} />

			{/* 3. Collections */}
			<CollectionsSectionSkeleton collectionsCount={6} />

			{/* 4. Reviews */}
			<ReviewsSectionSkeleton />

			{/* 5. Atelier Story */}
			<AtelierStorySkeleton />

			{/* 6. Creative Process */}
			<CreativeProcessSkeleton />

			{/* 7. FAQ */}
			<FaqSectionSkeleton />

			{/* 8. Newsletter */}
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
