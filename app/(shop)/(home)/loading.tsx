import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";
import { AtelierSectionSkeleton } from "./_components/atelier-section/atelier-section-skeleton";
import { HeroReassuranceBannerSkeleton } from "./_components/hero-reassurance-banner-skeleton";
import { HeroSectionSkeleton } from "./_components/hero-section-skeleton";
import { HomeFaqSkeleton } from "./_components/home-faq-skeleton";
import { LatestCreationsSkeleton } from "./_components/latest-creations-skeleton";

export default function HomeLoading() {
	return (
		<div
			className="min-h-dvh"
			role="status"
			aria-busy="true"
			aria-label="Chargement de la page d'accueil"
		>
			<span className="sr-only">Chargement en cours…</span>

			<HeroSectionSkeleton />
			<HeroReassuranceBannerSkeleton />
			<LatestCreationsSkeleton productsCount={4} />
			<CollectionsSectionSkeleton collectionsCount={6} />
			<AtelierSectionSkeleton />
			<HomeFaqSkeleton />
		</div>
	);
}
