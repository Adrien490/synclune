import type { CSSProperties } from "react";
import { WarningIcon } from "@phosphor-icons/react/ssr";

import { ProductCard } from "@/modules/products/components/product-card";
import { ProductCardSkeleton } from "@/modules/products/components/product-card-skeleton";
import { RefreshButton } from "@/modules/products/components/refresh-button";
import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { getWishlistProductIds } from "@/modules/wishlist/data/get-wishlist-product-ids";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

import { HeroAllCreationsCard } from "./hero-all-creations-card";
import { HeroEmptyCard } from "./hero-empty-card";

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
export const HERO_PRODUCTS_COUNT = 5;

/**
 * Décalage de la cascade d'entrée, en ms — dérivé de `MOTION_CONFIG`, jamais
 * écrit en littéral. Plafonné à 4 pas, la forme qu'avait la version en % de
 * plage (`6 %` par cran, plafond `24 %`).
 */
const ENTER_STAGGER_STEP_MS = Math.round(MOTION_CONFIG.stagger.normal * 1000);
const ENTER_STAGGER_MAX_MS = ENTER_STAGGER_STEP_MS * 4;

/**
 * Cellule qui prend les colonnes RESTANTES : le bloc titre occupe la largeur
 * entière sous `lg`, il ne partage sa rangée qu'à partir de `lg` (2 colonnes de
 * titre + 2 de cellule).
 */
const FULL_ROW_CELL = "col-span-2 md:col-span-3 lg:col-span-2";

/**
 * ⚠️ `enter-load` (temporel), PAS `enter-inview` (piloté par `view()`) — et
 * l'étal est la seule grille de l'app dans ce cas.
 *
 * Une entrée `view()` ne progresse qu'au SCROLL : pour un élément déjà au-dessus
 * de la flottaison au chargement, elle reste figée à mi-course indéfiniment.
 * Mesuré le 2026-08-06, sans scroll, après 5 s de repos, sur le rendu réel :
 *
 * - **768×1024** — la rangée 2 est dans le viewport (tops 950–953) et rend à
 *   `opacity` **0 · 0,03 · 0,13** : une bande blanche à la place de trois cartes.
 * - **1280×800** — la rangée 2 (tops 657–662) rend à **0,38 · 0,53 · 0,55 · 0,63**.
 * - **390×844** — la rangée 1 est à 32,61 % de progression contre une plage qui
 *   finissait à `cover 32%` : **7,9 px de marge**. Huit pixels de plus dans le
 *   bloc titre et la première création s'affichait fanée elle aussi.
 *
 * Le hero EST le premier écran à toutes les largeurs : y piloter l'entrée par le
 * scroll est une erreur de catégorie. Les cellules s'alignent donc sur ce que la
 * cellule titre fait déjà (`enter-load` + `HEADING_ENTER`, cf. `HeroSection`).
 * Les sections d'en dessous gardent `enter-inview`, où il opère vraiment.
 *
 * Bénéfice secondaire : cette grille vit derrière un `Suspense`, donc une cellule
 * insérée APRÈS le load joue son animation à l'insertion, au lieu d'hériter d'une
 * position de timeline déjà dépassée.
 */
function cellStyle(index: number): CSSProperties {
	return {
		"--enter-y": "20px",
		"--enter-delay": `${Math.min(index * ENTER_STAGGER_STEP_MS, ENTER_STAGGER_MAX_MS)}ms`,
	} as CSSProperties;
}

/**
 * Cellules « créations » de l'étal — rendues DANS la grille du bloc titre.
 *
 * @description
 * Ce composant ne rend aucun conteneur : ses cellules sont des enfants directs
 * de la grille de `HeroSection` (un fragment et une frontière `Suspense` ne
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
 * pratique — la lecture du cookie est déjà payée par le layout `(shop)`.
 */
export async function HeroGrid({
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
			<div className={`enter-load ${FULL_ROW_CELL}`} style={cellStyle(0)}>
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
			<div className={`enter-load ${FULL_ROW_CELL}`} style={cellStyle(0)}>
				<HeroEmptyCard />
			</div>
		);
	}

	return (
		<>
			{products.map((product, index) => (
				<div key={product.id} className="enter-load" style={cellStyle(index)}>
					<ProductCard
						product={product}
						index={index}
						sectionId="etal"
						isInWishlist={wishlistProductIds.has(product.id)}
					/>
				</div>
			))}
			<div className="enter-load" style={cellStyle(products.length)}>
				{/* `totalCount` = le catalogue PUBLIC entier (la lecture filtre déjà
				    `status: "PUBLIC"`), pas le nombre de cellules rendues. C'est ce
				    chiffre qui donne au lien sa PORTÉE — cf. le JSDoc de la carte. */}
				<HeroAllCreationsCard totalCount={result.totalCount} />
			</div>
		</>
	);
}

/**
 * Fallback de `HeroGrid` — même nombre de cellules, mêmes dimensions
 * (anti-CLS). Le bloc titre, lui, n'est jamais derrière ce fallback : il est
 * rendu hors de la frontière `Suspense`.
 *
 * ## Écarté après MESURE : la parité avec les branches dégradées
 *
 * Ce squelette rend `HERO_PRODUCTS_COUNT + 1` cellules quand les branches erreur
 * et catalogue-vide n'en rendent qu'UNE, pleine largeur. La conclusion évidente —
 * « donc un CLS de plusieurs centaines de px au swap » — est FAUSSE, et il ne faut
 * pas la « corriger » par une hauteur minimale sur la cellule dégradée.
 *
 * Le CLS ne compte que les éléments VISIBLES dans le viewport qui changent de
 * position ; un élément hors écran qui bouge, ou qui entre dans le viewport pour la
 * première fois, ne compte pas. Mesuré le 2026-08-05 : ce qui suit `#hero` commence
 * à **1719 px** à 390×844 et à **1155 px** à 1280×900 — hors viewport dans les deux
 * cas. La contraction de la grille ne déplace donc aucun élément visible : elle fait
 * seulement remonter, hors écran, ce qui vient après.
 *
 * Et dégrader ce squelette pour « faire la paire » pénaliserait le cas nominal
 * (celui de 99,9 % des chargements) au profit de deux branches rares — une panne de
 * lecture et un catalogue à zéro.
 */
export function HeroGridSkeleton() {
	return (
		<>
			{Array.from({ length: HERO_PRODUCTS_COUNT + 1 }, (_, index) => (
				<ProductCardSkeleton key={index} />
			))}
		</>
	);
}
