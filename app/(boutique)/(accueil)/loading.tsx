import { Skeleton } from "@/shared/components/ui/skeleton";
import { SECTION_SPACING } from "@/shared/constants/spacing";
import { LatestCreationsSkeleton } from "@/modules/products/components/latest-creations-skeleton";
import { ProductCarouselSkeleton } from "@/modules/products/components/product-carousel-skeleton";

/**
 * Loading state for home page
 * Reproduit EXACTEMENT la structure de la page réelle pour éviter le CLS
 *
 * Structure : Hero → LatestCreations → Collections → WhySynclune → CreativeProcess → Newsletter
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
			<section className="relative min-h-[calc(100vh-4rem)] sm:min-h-screen flex items-center overflow-hidden pt-20 sm:pt-24 md:pt-32 pb-16 sm:pb-20 md:pb-28">
				{/* Background gradient */}
				<div
					className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20"
					aria-hidden="true"
				/>

				<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
					<div className="grid lg:grid-cols-2 gap-8 sm:gap-10 lg:gap-12 items-center">
						{/* Contenu à gauche */}
						<div className="space-y-6 sm:space-y-8 md:space-y-10 flex flex-col items-center lg:items-start order-2 lg:order-1">
							{/* Titre principal */}
							<div className="space-y-4 sm:space-y-6 text-center lg:text-left w-full">
								{/* Titre "Des bijoux à votre image" */}
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
						<div className="order-1 lg:order-2">
							<ProductCarouselSkeleton />
						</div>
					</div>
				</div>

				{/* Bottom gradient mask */}
				<div className="absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-background to-transparent pointer-events-none" />
			</section>

			{/* 2. LatestCreations Section Skeleton - 12 produits (nouveautés) */}
			<LatestCreationsSkeleton productsCount={12} />

			{/* 3. Collections Section Skeleton - Carousel horizontal */}
			<section
				className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
				aria-label="Chargement des collections"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					{/* Header skeleton */}
					<header className="mb-8 text-center lg:mb-12">
						{/* Titre "Dernières collections" */}
						<Skeleton className="h-10 w-80 mx-auto bg-muted/50" />
						{/* Sous-titre */}
						<Skeleton className="mt-4 h-7 w-full max-w-2xl mx-auto bg-muted/30" />
					</header>

					{/* Carousel skeleton - scroll horizontal */}
					<div className="mb-8 lg:mb-12 overflow-hidden">
						<div className="flex gap-4 sm:gap-6 overflow-x-auto pb-4">
							{Array.from({ length: 6 }).map((_, i) => (
								<div
									key={i}
									className={`shrink-0 w-[280px] ${
										i === 0 ? "ml-[calc(50vw-140px)] sm:ml-6 lg:ml-8" : ""
									} ${
										i === 5 ? "mr-[calc(50vw-140px)] sm:mr-6 lg:mr-8" : ""
									}`}
								>
									<div className="space-y-4">
										{/* Image collection - aspect-square */}
										<div className="relative aspect-square overflow-hidden rounded-lg bg-muted/30 shadow-md">
											<Skeleton className="absolute inset-0 from-muted/50 via-muted/30 to-transparent" />
										</div>
										{/* Nom collection */}
										<Skeleton className="h-6 w-full bg-muted/40" />
									</div>
								</div>
							))}
						</div>
					</div>

					{/* CTA skeleton */}
					<div className="text-center">
						<Skeleton className="h-12 w-72 mx-auto bg-muted/40 rounded-lg shadow-lg" />
					</div>
				</div>
			</section>

			{/* 4. Why Synclune Section Skeleton - 4 pillars */}
			<section
				className={`relative overflow-hidden bg-background ${SECTION_SPACING.default}`}
				aria-label="Chargement de la section Pourquoi Synclune"
			>
				<div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
					{/* Header skeleton */}
					<header className="text-center mb-12 lg:mb-16">
						<Skeleton className="h-10 w-96 mx-auto bg-muted/50" />
						<div className="mt-4 space-y-2">
							<Skeleton className="h-6 w-full max-w-2xl mx-auto bg-muted/30" />
						</div>
					</header>

					{/* 4 pillars grid */}
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
						{Array.from({ length: 4 }).map((_, i) => (
							<article
								key={i}
								className="text-center p-6 rounded-xl bg-card border shadow-sm space-y-4"
							>
								{/* Icône */}
								<Skeleton className="h-16 w-16 mx-auto rounded-full bg-muted/40" />
								{/* Titre */}
								<Skeleton className="h-6 w-3/4 mx-auto bg-muted/50" />
								{/* Description */}
								<div className="space-y-2">
									<Skeleton className="h-4 w-full bg-muted/30" />
									<Skeleton className="h-4 w-full bg-muted/30" />
									<Skeleton className="h-4 w-5/6 mx-auto bg-muted/30" />
								</div>
								{/* CTA optionnel (dernier pillar) */}
								{i === 3 && (
									<Skeleton className="h-9 w-48 mx-auto bg-muted/30 rounded-md mt-4" />
								)}
							</article>
						))}
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
						<Skeleton className="h-10 w-96 mx-auto bg-muted/50" />
						<Skeleton className="mt-4 h-6 w-full max-w-2xl mx-auto bg-muted/30" />
					</header>

					<div className="grid lg:grid-cols-2 gap-12 items-center">
						{/* Image atelier - gauche sur desktop */}
						<div className="relative order-2 lg:order-1 h-80 sm:h-96 lg:h-[500px]">
							<div className="relative h-full w-full overflow-hidden rounded-2xl bg-muted shadow-xl">
								<Skeleton className="absolute inset-0 from-muted/50 via-muted/30 to-transparent" />
								{/* Badge "Fait main à Nantes" */}
								<div className="absolute top-4 right-4 z-10">
									<Skeleton className="h-8 w-40 bg-card/95 rounded-full" />
								</div>
							</div>
						</div>

						{/* Timeline processus - droite sur desktop */}
						<div className="relative order-1 lg:order-2 space-y-16">
							{Array.from({ length: 4 }).map((_, i) => (
								<article key={i} className="flex items-start gap-4">
									{/* Icône/numéro */}
									<Skeleton className="shrink-0 w-12 h-12 rounded-full bg-muted/40" />
									<div className="flex-1 space-y-2">
										{/* Titre étape */}
										<Skeleton className="h-6 w-40 bg-muted/50" />
										{/* Description */}
										<Skeleton className="h-4 w-full bg-muted/30" />
										<Skeleton className="h-4 w-5/6 bg-muted/30" />
									</div>
								</article>
							))}

							{/* CTA Section */}
							<div className="pt-6 border-t border-border space-y-4">
								<Skeleton className="h-4 w-full bg-muted/20" />
								<Skeleton className="h-12 w-full sm:w-56 bg-muted/40 rounded-lg shadow-sm" />
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* 6. Newsletter Section Skeleton */}
			<section
				className="relative bg-background py-16 px-4"
				aria-label="Chargement de la newsletter"
			>
				<div className="max-w-md mx-auto text-center space-y-4">
					{/* Titre */}
					<Skeleton className="h-7 w-80 mx-auto bg-muted/50" />
					{/* Description */}
					<Skeleton className="h-6 w-full max-w-sm mx-auto bg-muted/30" />
					{/* Formulaire */}
					<div className="flex flex-col gap-3 mt-4">
						<Skeleton className="h-12 w-full bg-muted/30 rounded-lg" />
						<Skeleton className="h-4 w-3/4 mx-auto bg-muted/20" />
					</div>
				</div>
			</section>
		</div>
	);
}
