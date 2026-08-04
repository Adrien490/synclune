import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";

export function CollectionGridSkeleton() {
	return (
		<div className="space-y-8">
			{/* Grille des collections — la chaîne de classes est un MIROIR EXACT de
			    celle de `collection-grid.tsx` (verrouillé par
			    `collection-skeleton-parity.regression.test.ts`) : deux chaînes
			    différentes, et le squelette ne recouvre plus la grille qu'il annonce. */}
			<div className="xs:grid-cols-2 grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8">
				{Array.from({ length: 8 }).map((_, i) => (
					/* Cadre planche-contact — miroir de CollectionCard (redesign 2026-08-03) :
					   `rounded-md border-2 p-2 pb-0 sm:p-2.5 sm:pb-0`, tirage `rounded-sm`,
					   légende `gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4`
					   (eyebrow h-3 → titre `text-base sm:text-lg` → description → prix) */
					<div
						key={i}
						className="bg-card rounded-md border-2 border-transparent p-2 pb-0 shadow-sm sm:p-2.5 sm:pb-0"
					>
						<Skeleton className="aspect-square w-full rounded-sm" />

						<div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
							{/* Eyebrow « Collection · N créations » */}
							<Skeleton className="h-3 w-28" />

							{/* Titre — DEUX lignes réservées sous `sm`, une seule au-dessus.
							    Même arbitrage mesuré que `product-card-skeleton` : à 163px de
							    large (2 colonnes dès 375px), un nom de collection wrappe
							    presque toujours. Le squelette n'en réservait qu'une, et la
							    grille sautait d'une ligne à l'arrivée des données. */}
							<Skeleton className="h-12 w-3/4 sm:h-7" />

							{/* Description */}
							<Skeleton className="h-4 w-full" />

							{/* Price skeleton (from-price) */}
							<Skeleton className="h-4 w-24" />
						</div>
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="flex justify-end">
				<CursorPaginationSkeleton />
			</div>
		</div>
	);
}
