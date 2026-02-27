import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { AtelierStorySkeleton } from "./_components/atelier-story-skeleton";
import { CreativeProcessSkeleton } from "./_components/creative-process-skeleton";
import { FaqSectionSkeleton } from "./_components/faq-section-skeleton";
import { HeroSectionSkeleton } from "./_components/hero-section-skeleton";
import { LatestCreationsSkeleton } from "./_components/latest-creations-skeleton";
import { NewsletterSectionSkeleton } from "./_components/newsletter-section-skeleton";
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
			<NewsletterSectionSkeleton />
		</div>
	);
}
