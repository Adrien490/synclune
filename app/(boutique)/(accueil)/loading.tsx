import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { SparklesDivider } from "@/shared/components/section-divider";
import { AtelierStorySkeleton } from "./_components/atelier-story-skeleton";
import { BestsellersSkeleton } from "./_components/bestsellers-skeleton";
import { CreativeProcessSkeleton } from "./_components/creative-process-skeleton";
import { FaqSectionSkeleton } from "./_components/faq-section-skeleton";
import { HeroSkeleton } from "./_components/hero-skeleton";
import { LatestCreationsSkeleton } from "./_components/latest-creations-skeleton";

/**
 * Loading state for home page
 * Reproduit EXACTEMENT la structure de la page réelle pour éviter le CLS
 *
 * Structure : Hero → Bestsellers → LatestCreations → Collections → AtelierStory → CreativeProcess
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
			<HeroSkeleton />
			<BestsellersSkeleton />
			<LatestCreationsSkeleton productsCount={8} />
			<CollectionsSectionSkeleton collectionsCount={6} />
			<SparklesDivider />
			<AtelierStorySkeleton />
			<CreativeProcessSkeleton />
			<FaqSectionSkeleton />
		</div>
	);
}
