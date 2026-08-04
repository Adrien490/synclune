import { CursorPaginationSkeleton } from "@/shared/components/cursor-pagination";
import { LoadMoreSkeleton } from "@/shared/components/load-more";
import type { CSSProperties } from "react";

import { CATALOG_PENDING_DIM, CATALOG_ROW_CELL } from "./catalog-grid.constants";
import { ProductCardSkeleton } from "./product-card-skeleton";

/**
 * Fallback de `ProductList` — mêmes CELLULES, mêmes gates de breakpoint.
 *
 * @description
 * Comme la liste réelle, ce squelette ne rend **aucun conteneur** : ses cellules
 * sont des enfants directs de la grille de `ProductCatalog`. C'est ce qui laisse
 * le bloc titre visible pendant que la grille se peuple, au lieu de le voir
 * disparaître avec elle.
 *
 * ⚠️ Les gates de pagination doivent rester STRICTEMENT ceux de
 * `product-list.tsx`. Sans le `hidden … md:flex`, ce squelette réservait sous
 * 48 rem une barre de pagination alignée à droite là où le contenu réel sert un
 * bloc « voir plus » centré et plus haut : la grille sautait au moment exact du
 * swap Suspense → contenu, sur la seule page dont le CLS est budgété en CI
 * (`e2e/performance.spec.ts`, « page produits - CLS under 0.15 »).
 *
 * La carte est le SSOT `ProductCardSkeleton` — la parité anti-CLS avec
 * `ProductCard` (ratio, cadre, légende) est structurelle, plus une copie à
 * maintenir (`skeleton-card-ratio-parity.regression.test.ts`).
 */
export function ProductListSkeleton() {
	return (
		<>
			{/* Une seule animation d'entrée : `.product-item` (comme la vraie grille,
			 * via `--item-index`), qui porte déjà son propre repli reduced-motion. */}
			{Array.from({ length: 8 }).map((_, i) => (
				<div key={i} className="product-item" style={{ "--item-index": i } as CSSProperties}>
					<ProductCardSkeleton />
				</div>
			))}

			<div className={`${CATALOG_ROW_CELL} ${CATALOG_PENDING_DIM}`}>
				<div className="mt-6 md:hidden">
					<LoadMoreSkeleton />
				</div>
				<div className="mt-8 hidden justify-end md:flex lg:mt-12">
					<CursorPaginationSkeleton />
				</div>
			</div>
		</>
	);
}
