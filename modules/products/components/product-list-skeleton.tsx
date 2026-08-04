import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { CSSProperties } from "react";

import { ProductCardSkeleton } from "./product-card-skeleton";

export function ProductListSkeleton() {
	return (
		<div className="space-y-6">
			{/* Compteur de resultats */}
			<div className="flex items-center justify-between">
				<Skeleton className="h-5 w-24 rounded" />
			</div>

			{/* Grille des produits */}
			{/* Doit rester strictement aligné sur `product-list.tsx` — 4 colonnes max,
			 * pas de palier `2xl:` (conteneur capé à max-w-6xl). */}
			<div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
				{/* Une seule animation d'entrée : `.product-item` (comme la vraie grille,
				 * via --item-index). La carte est le SSOT `ProductCardSkeleton` — la
				 * parité anti-CLS avec ProductCard (ratio, cadre, légende) est
				 * structurelle, plus une copie à maintenir. */}
				{Array.from({ length: 8 }).map((_, i) => (
					<div key={i} className="product-item" style={{ "--item-index": i } as CSSProperties}>
						<ProductCardSkeleton />
					</div>
				))}
			</div>

			{/* Pagination */}
			<div className="mt-8 flex justify-end lg:mt-12">
				<CursorPaginationSkeleton />
			</div>
		</div>
	);
}
