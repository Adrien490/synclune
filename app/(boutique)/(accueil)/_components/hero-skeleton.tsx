import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le Hero de la page d'accueil
 * Reproduit exactement la structure du Hero pour éviter le CLS
 */
export function HeroSkeleton() {
	return (
		<section className="relative min-h-[calc(75dvh-4rem)] sm:min-h-[calc(90dvh-5rem)] lg:min-h-screen flex items-center overflow-hidden pt-16 sm:pt-20 md:pt-28 pb-10 sm:pb-16 md:pb-24 mask-b-from-85% mask-b-to-100%">
			{/* Background gradient */}
			<div
				className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20"
				aria-hidden="true"
			/>

			<div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl relative z-10">
				<div className="flex flex-col items-center">
					{/* Contenu centré */}
					<div className="space-y-5 sm:space-y-7 md:space-y-10 flex flex-col items-center">
						{/* Titre principal */}
						<div className="space-y-4 sm:space-y-6 text-center w-full">
							{/* Titre "Des bijoux colorés" */}
							<Skeleton className="h-12 sm:h-16 lg:h-20 w-72 sm:w-80 mx-auto bg-muted/50" />

							{/* Description */}
							<Skeleton className="h-7 sm:h-8 w-full max-w-lg mx-auto bg-muted/30" />
						</div>

						{/* CTA Buttons - centrés */}
						<div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
							<Skeleton className="h-11 w-full sm:w-48 bg-primary/20 rounded-lg" />
							<Skeleton className="h-11 w-full sm:w-56 bg-muted/40 rounded-lg" />
						</div>

						{/* Réseaux sociaux - icônes rondes */}
						<div className="flex items-center justify-center gap-3">
							<Skeleton className="h-5 w-24 bg-muted/30 hidden sm:block" />
							<div className="flex items-center gap-4">
								<Skeleton className="size-11 rounded-full bg-muted/30" />
								<Skeleton className="size-11 rounded-full bg-muted/30" />
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
