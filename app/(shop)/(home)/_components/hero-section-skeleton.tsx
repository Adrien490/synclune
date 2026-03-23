import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le Hero de la page d'accueil
 * Reproduit exactement la structure du Hero pour éviter le CLS
 */
export function HeroSectionSkeleton() {
	return (
		<section className="relative flex min-h-[calc(60dvh-4rem)] items-center overflow-hidden mask-b-from-90% mask-b-to-100% pt-16 pb-10 sm:min-h-[calc(90dvh-5rem)] sm:mask-b-from-85% sm:pt-20 sm:pb-16 md:pt-28 md:pb-24 lg:min-h-screen">
			{/* Background gradient */}
			<div
				className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20"
				aria-hidden="true"
			/>

			{/* Floating image placeholders — diamond layout, matches hero-floating-images breakpoints */}
			<div className="absolute inset-0 z-0 hidden md:block" aria-hidden="true">
				{/* Top-left — large (tabletVisible) */}
				<Skeleton className="bg-muted/30 absolute top-[12%] left-[2%] aspect-[4/5] w-32 -rotate-8 rounded-2xl md:w-36 lg:w-40 xl:left-[4%] xl:w-48 2xl:w-56" />
				{/* Top-right — medium (desktop only) */}
				<Skeleton className="bg-muted/30 absolute top-[8%] right-[3%] hidden aspect-[4/5] w-32 rotate-5 rounded-2xl lg:block xl:right-[5%] xl:w-40 2xl:w-48" />
				{/* Bottom-left — small (desktop only) */}
				<Skeleton className="bg-muted/30 absolute bottom-[14%] left-[12%] hidden aspect-[4/5] w-28 rotate-3 rounded-2xl lg:block xl:left-[14%] xl:w-34 2xl:w-40" />
				{/* Bottom-right — medium (tabletVisible) */}
				<Skeleton className="bg-muted/30 absolute right-[10%] bottom-[18%] aspect-[4/5] w-32 -rotate-4 rounded-2xl md:w-34 lg:w-32 xl:right-[12%] xl:w-38 2xl:w-44" />
			</div>

			<div className="relative z-10 container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col items-center">
					{/* Contenu centré */}
					<div className="flex flex-col items-center space-y-5 sm:space-y-7 md:space-y-10">
						{/* Titre principal */}
						<div className="w-full space-y-4 text-center sm:space-y-6">
							{/* Titre "Des bijoux colorés" */}
							<Skeleton className="bg-muted/50 mx-auto h-12 w-72 sm:h-16 sm:w-80 lg:h-20" />

							{/* Description */}
							<Skeleton className="bg-muted/30 mx-auto h-7 w-full max-w-lg sm:h-8" />
						</div>

						{/* CTA Buttons - centrés */}
						<div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:gap-4">
							<Skeleton className="bg-primary/20 h-11 w-full rounded-lg sm:w-48" />
							<Skeleton className="bg-muted/40 h-11 w-full rounded-lg sm:w-56" />
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
