import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le Hero de la page d'accueil
 * Reproduit exactement la structure du Hero pour éviter le CLS
 */
export function HeroSectionSkeleton() {
	return (
		<section className="relative min-h-[calc(85dvh-4rem)] sm:min-h-[calc(90dvh-5rem)] lg:min-h-screen flex items-center overflow-hidden pt-16 sm:pt-20 md:pt-28 pb-10 sm:pb-16 md:pb-24 mask-b-from-85% mask-b-to-100%">
			{/* Background gradient */}
			<div
				className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20"
				aria-hidden="true"
			/>

			{/* Floating image placeholders — diamond layout, matches hero-floating-images breakpoints */}
			<div className="absolute inset-0 z-0 hidden md:block" aria-hidden="true">
				{/* Top-left — large (tabletVisible) */}
				<Skeleton className="absolute left-[2%] xl:left-[4%] top-[12%] w-32 md:w-36 lg:w-40 xl:w-48 2xl:w-56 aspect-[4/5] rounded-2xl bg-muted/30 -rotate-8" />
				{/* Top-right — medium (desktop only) */}
				<Skeleton className="absolute right-[3%] xl:right-[5%] top-[8%] hidden lg:block w-32 xl:w-40 2xl:w-48 aspect-[4/5] rounded-2xl bg-muted/30 rotate-5" />
				{/* Bottom-left — small (desktop only) */}
				<Skeleton className="absolute left-[12%] xl:left-[14%] bottom-[14%] hidden lg:block w-28 xl:w-34 2xl:w-40 aspect-[4/5] rounded-2xl bg-muted/30 rotate-3" />
				{/* Bottom-right — medium (tabletVisible) */}
				<Skeleton className="absolute right-[10%] xl:right-[12%] bottom-[18%] w-32 md:w-34 lg:w-32 xl:w-38 2xl:w-44 aspect-[4/5] rounded-2xl bg-muted/30 -rotate-4" />
			</div>

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
					</div>
				</div>
			</div>
		</section>
	);
}
