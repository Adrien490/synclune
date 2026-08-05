import type { CSSProperties } from "react";

import { EtalCardSkeleton } from "./etal-card";
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
 * ⚠️ La bande de pagination desktop (`StorefrontPaginationBand`) n'est PAS
 * réservée ici : le squelette ne peut pas savoir s'il y aura une page 2 (la
 * bande ne se rend que si la liste dépasse une page), et elle vit sous le pli
 * d'une grille pleine — le swap Suspense → contenu n'y produit aucun décalage
 * VISIBLE, seul comptabilisé par le CLS budgété en CI
 * (`e2e/performance.spec.ts`, « page produits - CLS under 0.15 »).
 *
 * ⚠️ Le carton d'étal est une **cellule**, plus un pied centré : son squelette
 * en est une lui aussi, à la même place dans le flux. La parité de géométrie
 * vit dans `etal-card.tsx`, où le carton et son miroir partagent leurs
 * constantes — pas dans une copie posée ici, qui dériverait au premier
 * changement.
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

			<EtalCardSkeleton className="md:hidden" />
		</>
	);
}
