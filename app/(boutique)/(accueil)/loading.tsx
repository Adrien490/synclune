import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { LatestCreationsSkeleton } from "@/app/(boutique)/(accueil)/_components/latest-creations-skeleton";
import { ProductCarouselSkeleton } from "@/modules/products/components/product-carousel-skeleton";
import { CollectionsSectionSkeleton } from "@/modules/collections/components/collections-section-skeleton";

/**
 * Loading state for home page
 * Reproduit EXACTEMENT la structure de la page réelle pour éviter le CLS
 *
 * Structure : Hero → LatestCreations → Collections → AtelierStory → CreativeProcess
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

			{/* 1. Hero Section Skeleton - Structure exacte avec ProductCarousel */}
			<section className="relative min-h-[85vh] sm:min-h-screen flex items-center overflow-hidden pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-20 md:pb-28">
				{/* Background gradient */}
				<div
					className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20"
					aria-hidden="true"
				/>

				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
					<div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
						{/* Contenu à gauche */}
						<div className="space-y-6 sm:space-y-8 md:space-y-10 flex flex-col items-center lg:items-start">
							{/* Titre principal */}
							<div className="space-y-4 sm:space-y-6 text-center lg:text-left w-full">
								{/* Titre "Des bijoux à ton image" */}
								<Skeleton className="h-12 sm:h-16 lg:h-20 w-full max-w-md lg:mx-0 mx-auto bg-muted/50" />

								{/* Description avec heart icon */}
								<div className="space-y-2">
									<Skeleton className="h-7 sm:h-8 w-full max-w-2xl lg:mx-0 mx-auto bg-muted/30" />
									<Skeleton className="h-7 sm:h-8 w-5/6 max-w-xl lg:mx-0 mx-auto bg-muted/30" />
								</div>
							</div>

							{/* CTA Buttons */}
							<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
								<Skeleton className="h-12 w-full sm:w-64 bg-primary/20 rounded-lg shadow-xl" />
								<Skeleton className="h-12 w-full sm:w-56 bg-muted/40 rounded-lg shadow-lg" />
							</div>

							{/* Réseaux sociaux */}
							<div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full">
								<Skeleton className="h-5 w-24 bg-muted/30" />
								<div className="flex gap-2 sm:gap-3">
									<Skeleton className="h-9 w-32 bg-muted/30 rounded-lg" />
									<Skeleton className="h-9 w-32 bg-muted/30 rounded-lg" />
								</div>
							</div>
						</div>

						{/* ProductCarousel à droite */}
						<div>
							<ProductCarouselSkeleton />
						</div>
					</div>
				</div>
			</section>

			{/* 2. LatestCreations Section Skeleton - 12 produits (nouveautés) */}
			<LatestCreationsSkeleton productsCount={12} />

			{/* 3. Collections Section Skeleton - Utilise le composant existant */}
			<CollectionsSectionSkeleton collectionsCount={6} />

			{/* 4. AtelierStory Section Skeleton - Confession créative de Léane */}
			<section
				className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
				aria-label="Chargement de la section atelier"
			>
				<div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
					{/* Image principale - aspect 4:3 mobile, 16:9 desktop */}
					<div className="mb-8 sm:mb-12">
						<Skeleton className="w-full aspect-[4/3] sm:aspect-[16/9] rounded-xl bg-muted/40" />
					</div>

					{/* Séparateur décoratif avec 3 sparkles */}
					<div
						className="flex justify-center items-center gap-3 mb-8 sm:mb-12"
						aria-hidden="true"
					>
						<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
						<Skeleton className="h-5 w-5 rounded-full bg-muted/40" />
						<Skeleton className="h-4 w-4 rounded-full bg-muted/30" />
					</div>

					{/* Bloc de texte centré */}
					<div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
						{/* Badge "Depuis mon atelier" */}
						<Skeleton className="h-5 w-36 mx-auto bg-muted/30" />

						{/* Titre accrocheur "Je vais te faire une confidence" */}
						<Skeleton className="h-10 sm:h-12 w-full max-w-md mx-auto bg-muted/50" />

						{/* 4 paragraphes de texte narratif */}
						<div className="space-y-4 sm:space-y-6">
							{/* Paragraphe 1 */}
							<div className="space-y-2">
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-3/4 mx-auto bg-muted/30" />
							</div>
							{/* Paragraphe 2 */}
							<div className="space-y-2">
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-5/6 mx-auto bg-muted/30" />
							</div>
							{/* Paragraphe 3 */}
							<div className="space-y-2">
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-full bg-muted/30" />
								<Skeleton className="h-5 w-4/5 mx-auto bg-muted/30" />
							</div>
							{/* Paragraphe emphase (plus visible) */}
							<div className="space-y-2">
								<Skeleton className="h-6 w-3/4 mx-auto bg-muted/40" />
								<Skeleton className="h-6 w-2/3 mx-auto bg-muted/40" />
							</div>
						</div>

						{/* Signature "— Léane" */}
						<Skeleton className="h-8 w-24 mx-auto bg-muted/30 mt-4" />
					</div>

					{/* Section images secondaires + CTA */}
					<div className="mt-12 sm:mt-16 space-y-10">
						{/* Grid 2 images */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
							<Skeleton className="w-full aspect-[4/3] rounded-xl bg-muted/40" />
							<Skeleton className="w-full aspect-[4/3] rounded-xl bg-muted/40" />
						</div>

						{/* CTA centré */}
						<div className="flex flex-col items-center gap-4">
							<Skeleton className="h-5 w-64 bg-muted/30" />
							<Skeleton className="h-12 w-64 rounded-lg bg-muted/40 shadow-md" />
						</div>
					</div>
				</div>
			</section>

			{/* 5. Creative Process Section Skeleton - Image + Timeline */}
			<section
				className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
				aria-label="Chargement du processus créatif"
			>
				<div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					{/* Header skeleton */}
					<header className="text-center mb-12 lg:mb-16">
						<Skeleton className="h-10 w-80 mx-auto bg-muted/50" />
						<Skeleton className="mt-4 h-6 w-full max-w-2xl mx-auto bg-muted/30" />
					</header>

					<div className="grid lg:grid-cols-2 gap-12 items-center">
						{/* Image atelier - order-1 (en premier sur mobile et desktop) */}
						<div className="relative order-1 h-48 sm:h-80 lg:h-full min-h-[300px]">
							<div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-xl">
								<Skeleton className="absolute inset-0 bg-muted/40" />
								{/* Badge "Fait main à Nantes" */}
								<div className="absolute top-4 right-4 z-10">
									<Skeleton className="h-8 w-40 bg-secondary/30 rounded-full" />
								</div>
							</div>
						</div>

						{/* Timeline processus - order-2 */}
						<div className="relative order-2 space-y-8 sm:space-y-12 lg:space-y-16">
							{/* 4 étapes du processus */}
							{Array.from({ length: 4 }).map((_, i) => (
								<article key={i} className="flex items-start gap-4">
									{/* Icône/numéro */}
									<Skeleton className="shrink-0 w-11 sm:w-12 h-11 sm:h-12 rounded-full bg-muted/40" />
									<div className="flex-1 space-y-2 pb-8">
										{/* Titre étape */}
										<Skeleton className="h-6 w-40 bg-muted/50" />
										{/* Description */}
										<Skeleton className="h-5 w-full bg-muted/30" />
										<Skeleton className="h-5 w-5/6 bg-muted/30" />
									</div>
								</article>
							))}

							{/* CTA Section */}
							<div className="flex items-start gap-4">
								{/* Icône bonus */}
								<Skeleton className="shrink-0 w-11 sm:w-12 h-11 sm:h-12 rounded-full bg-muted/30 border-2 border-dashed border-muted" />
								<div className="flex-1 space-y-3">
									<Skeleton className="h-4 w-full bg-muted/20" />
									<Skeleton className="h-12 w-full sm:w-56 bg-muted/40 rounded-lg shadow-sm" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
