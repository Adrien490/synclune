import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { AtelierSectionSkeleton } from "./_components/atelier-section";
import { HeroSectionSkeleton } from "./_components/hero-section-skeleton";
import { HomeFaqSkeleton } from "./_components/home-faq-skeleton";
import { LatestCreationsSkeleton } from "./_components/latest-creations-skeleton";
import { ReviewsSectionSkeleton } from "./_components/reviews-section-skeleton";

export default function HomeLoading() {
	return (
		<div
			className="min-h-screen"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la page d'accueil"
		>
			<span className="sr-only">Chargement en cours...</span>

			<HeroSectionSkeleton />
			<LatestCreationsSkeleton productsCount={4} />
			<CollectionsSectionSkeleton collectionsCount={6} />
			<ReviewsSectionSkeleton />
			<AtelierSectionSkeleton />
			<HomeFaqSkeleton />
		</div>
	);
}
