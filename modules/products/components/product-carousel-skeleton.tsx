import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton pour ProductCarousel
 * Utilisé dans Suspense pour le chargement initial
 *
 * ⚠️ IMPORTANT: Ce skeleton DOIT correspondre EXACTEMENT à l'interface réelle
 * pour éviter le layout shift et garantir une expérience fluide
 */
export function ProductCarouselSkeleton() {
	return (
		<div className="max-w-7xl mx-auto">
			<div className="relative h-full min-h-[320px] sm:min-h-[400px] lg:min-h-[480px] rounded-2xl overflow-hidden bg-muted shadow-2xl">
				{/* Image skeleton */}
				<Skeleton className="absolute inset-0" />

				{/* Overlay gradient (identique à l'interface réelle) */}
				<div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />

				{/* Info produit skeleton - en bas avec espacement responsive */}
				<div className="absolute bottom-0 left-0 right-0 p-4 pb-14 sm:p-6 sm:pb-6 text-white z-10 space-y-2">
					<Skeleton className="h-8 w-3/4 bg-white/20 drop-shadow-lg" />
					<Skeleton className="h-6 w-24 bg-white/20 drop-shadow-md" />
				</div>

				{/* Overlay decoratif (identique à l'interface réelle) */}
				<div className="absolute inset-0 bg-linear-to-tr from-primary/10 via-transparent to-secondary/10 pointer-events-none" />

				{/* Navigation buttons skeleton - Style exact de l'interface réelle */}
				<div className="absolute left-4 top-1/2 -translate-y-1/2">
					<Skeleton className="size-10 rounded-full bg-white/80 backdrop-blur-sm border border-white/40 shadow-lg" />
				</div>
				<div className="absolute right-4 top-1/2 -translate-y-1/2">
					<Skeleton className="size-10 rounded-full bg-white/80 backdrop-blur-sm border border-white/40 shadow-lg" />
				</div>

				{/* Dots indicator skeleton - Structure responsive identique à l'interface réelle */}
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-2 z-20">
					{Array.from({ length: 3 }).map((_, index) => (
						<div
							key={index}
							className="h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center"
						>
							<Skeleton
								className={
									index === 0
										? "h-2 w-8 sm:h-2.5 sm:w-10 rounded-full bg-white shadow-md"
										: "h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-white/60"
								}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
