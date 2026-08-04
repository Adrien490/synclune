"use client";

import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Skeleton de chargement pour le cart sheet
 * Affiche 3 items placeholder pendant le fetch initial
 */
export function CartSheetSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			aria-label="Chargement du panier"
			// `space-y-3` et non `gap-y-4` : sur un conteneur `block`, `gap` n'a
			// aucun effet — les trois lignes du skeleton étaient collées alors que
			// la vraie liste les espace de 12 px, donc un saut de layout au montage.
			className="flex-1 space-y-3 px-6 py-4"
		>
			{/* Géométrie strictement alignée sur `CartSheetItemRow` — surface `bg-card`
			    en rayon `rounded-md`, bordure transparente, ombre, et la MÊME rotation
			    alternée : un skeleton qui ne pivote pas produirait un saut au montage. */}
			{Array.from({ length: 3 }).map((_, i) => (
				<div
					key={i}
					className="bg-card grid grid-cols-[5rem_1fr] gap-3.5 rounded-md border border-transparent p-3 shadow-sm sm:grid-cols-[6rem_1fr] sm:p-3.5"
					style={{ transform: i % 2 === 0 ? "rotate(-0.4deg)" : "rotate(0.4deg)" }}
				>
					{/* Image placeholder - row-span-2 matching actual layout */}
					<Skeleton className="row-span-2 size-20 rounded-md sm:size-24" />

					{/* Content placeholder */}
					<div className="min-w-0 space-y-2">
						<Skeleton className="h-4 w-3/4" />
						<Skeleton className="h-3 w-1/2" />
						<Skeleton className="h-4 w-1/3" />
					</div>

					{/* Actions placeholder - same row as image row 2 */}
					<div className="flex items-center justify-between gap-2">
						<Skeleton className="h-11 w-28" />
						<Skeleton className="h-4 w-14" />
					</div>
				</div>
			))}
		</div>
	);
}
