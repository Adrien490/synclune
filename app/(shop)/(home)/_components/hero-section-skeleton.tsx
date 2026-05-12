import { HeroFloatingImagesSkeleton } from "./hero-floating-images-skeleton";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le Hero de la page d'accueil
 * Reproduit exactement la structure du Hero pour éviter le CLS
 */
export function HeroSectionSkeleton() {
	return (
		<section className="relative flex min-h-[calc(60svh-var(--navbar-height,4rem))] items-center overflow-hidden mask-b-from-90% mask-b-to-100% pt-[calc(var(--navbar-height,4rem)+1rem)] pb-10 sm:min-h-[calc(90svh-var(--navbar-height,5rem))] sm:mask-b-from-92% sm:pt-[calc(var(--navbar-height,5rem)+1.5rem)] sm:pb-16 md:pt-[calc(var(--navbar-height,5rem)+3rem)] md:pb-24 lg:min-h-screen">
			{/* Background gradient */}
			<div
				className="absolute inset-0 bg-linear-to-br from-pink-50/20 via-transparent to-amber-50/20"
				aria-hidden="true"
			/>

			{/* Floating image placeholders — diamond layout, matches hero-floating-images breakpoints */}
			<HeroFloatingImagesSkeleton />

			<div className="relative z-10 container mx-auto max-w-6xl pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))] sm:pl-[max(1.5rem,env(safe-area-inset-left))] lg:pr-[max(2rem,env(safe-area-inset-right))] lg:pl-[max(2rem,env(safe-area-inset-left))] 2xl:max-w-7xl">
				<div className="flex flex-col items-center">
					{/* Contenu centré */}
					<div className="flex flex-col items-center gap-y-5 sm:gap-y-7 md:gap-y-10">
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
