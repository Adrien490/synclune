import { ProductCarouselSkeleton } from "@/modules/products/components/product-carousel-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le Hero de la page d'accueil
 * Reproduit exactement la structure du Hero pour éviter le CLS
 */
export function HeroSkeleton() {
	return (
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
	);
}
