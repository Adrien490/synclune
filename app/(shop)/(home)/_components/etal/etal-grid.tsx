import type { CSSProperties } from "react";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { ProductCard } from "@/modules/products/components/product-card";
import { ProductCardSkeleton } from "@/modules/products/components/product-card-skeleton";
import { RefreshButton } from "@/modules/products/components/refresh-button";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

import { EtalAllCreationsCard } from "./etal-all-creations-card";
import { EtalEmptyCard } from "./etal-empty-card";

/**
 * Nombre de créations montrées sur l'étal.
 *
 * 5 — et pas 4 ni 6 : avec la cellule « Voir toutes les créations », le compte
 * de cellules tombe juste aux TROIS largeurs, le bloc titre compris.
 * - `lg` (4 col.) : titre (2) + 2 · 4 → 2 rangées pleines
 * - `md` (3 col.) : titre (3) · 3 · 3 → 3 rangées pleines
 * - base (2 col.) : titre (2) · 2 · 2 · 2 → 4 rangées pleines
 *
 * Toute autre valeur laisse une rangée amputée quelque part.
 */
export const ETAL_PRODUCTS_COUNT = 5;

/** Décalage de la cascade d'entrée, en % de la plage `entry` (cf. entrance.css). */
const ENTER_STAGGER_STEP_PCT = 6;
const ENTER_STAGGER_MAX_PCT = 24;

/**
 * Cellule qui prend les colonnes RESTANTES : le bloc titre occupe la largeur
 * entière sous `lg`, il ne partage sa rangée qu'à partir de `lg` (2 colonnes de
 * titre + 2 de cellule).
 */
const FULL_ROW_CELL = "col-span-2 md:col-span-3 lg:col-span-2";

function cellStyle(index: number): CSSProperties {
	return {
		"--enter-y": "20px",
		"--enter-stagger": `${Math.min(index * ENTER_STAGGER_STEP_PCT, ENTER_STAGGER_MAX_PCT)}%`,
	} as CSSProperties;
}

/**
 * Cellules « créations » de l'étal — rendues DANS la grille du bloc titre.
 *
 * @description
 * Ce composant ne rend aucun conteneur : ses cellules sont des enfants directs
 * de la grille de `EtalSection` (un fragment et une frontière `Suspense` ne
 * produisent pas de nœud DOM, donc ne cassent pas le placement en grille).
 * C'est ce qui permet au bloc titre d'être la première CELLULE de la grille des
 * créations plutôt qu'une bande posée au-dessus.
 *
 * ⚠️ Pas de `disablePreload` sur la carte d'index 0, bien qu'elle vive derrière
 * un `Suspense` : la paire `preload` + `fetchPriority="high"` est aussi ce qui
 * donne `loading="eager"` aux cartes above-fold. La couper ici mettrait en
 * `lazy` les deux premières pièces de l'étal — les plus visibles de la page.
 * Le `<h1>` (texte, hors frontière) et cette première photo sont les deux
 * candidats LCP réels ; ils ne se disputent pas la bande passante.
 *
 * ⚠️ La lecture des favoris (cookie) rend ce sous-arbre DYNAMIQUE. C'est
 * assumé : sans elle, `isInWishlist` vaut `false` pour tout le monde, or
 * `useWishlistToggle` n'a pas d'autre source de vérité que cette prop —
 * une visiteuse ayant déjà mis un bijou en favori voyait un cœur vide, et son
 * clic le RETIRAIT (`toggleWishlistItem` : « présent → retire ») sous une UI
 * optimiste qui promettait l'inverse. Les 6 autres grilles de l'app passent
 * toutes cet état ; l'étal était le seul à ne pas le faire. Le coût est nul en
 * pratique — le layout `(shop)` lit déjà `getSession()`.
 */
export async function EtalGrid({
	productsPromise,
}: {
	productsPromise: Promise<GetProductsReturn>;
}) {
	const [result, wishlistProductIds] = await Promise.all([
		productsPromise,
		getWishlistProductIds(),
	]);

	const { products } = result;
	const error = "error" in result ? result.error : undefined;

	// Une panne de lecture rend `{ products: [] }` : sans cette branche, l'étal
	// annonce « L'atelier remplit ses étagères » — on présente une panne comme un
	// catalogue vide, sans aucun moyen de réessayer. Même repli que ProductList.
	if (error) {
		return (
			<div className={`enter-inview ${FULL_ROW_CELL}`} style={cellStyle(0)}>
				<Alert variant="destructive">
					<WarningIcon className="size-4" />
					<AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<span>Les créations n&apos;ont pas pu être chargées.</span>
						<RefreshButton />
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	if (products.length === 0) {
		return (
			<div className={`enter-inview ${FULL_ROW_CELL}`} style={cellStyle(0)}>
				<EtalEmptyCard />
			</div>
		);
	}

	return (
		<>
			{products.map((product, index) => (
				<div key={product.id} className="enter-inview" style={cellStyle(index)}>
					<ProductCard
						product={product}
						index={index}
						sectionId="etal"
						isInWishlist={wishlistProductIds.has(product.id)}
					/>
				</div>
			))}
			<div className="enter-inview" style={cellStyle(products.length)}>
				<EtalAllCreationsCard />
			</div>
		</>
	);
}

/**
 * Fallback de `EtalGrid` — même nombre de cellules, mêmes dimensions
 * (anti-CLS). Le bloc titre, lui, n'est jamais derrière ce fallback : il est
 * rendu hors de la frontière `Suspense`.
 */
export function EtalGridSkeleton() {
	return (
		<>
			{Array.from({ length: ETAL_PRODUCTS_COUNT + 1 }, (_, index) => (
				<ProductCardSkeleton key={index} />
			))}
		</>
	);
}
