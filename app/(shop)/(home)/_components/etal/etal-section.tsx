import { Suspense, type CSSProperties } from "react";

import type { GetProductsReturn } from "@/modules/products/data/get-products";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { CONTAINER_CLASS } from "@/shared/constants/spacing";

import { EtalGrid, EtalGridSkeleton } from "./etal-grid";
import { EtalHeading } from "./etal-heading";

const TITLE_ID = "etal-title";

const HEADING_ENTER: CSSProperties = {
	"--enter-y": "12px",
	"--enter-duration": `${Math.round(MOTION_CONFIG.duration.emphasis * 1000)}ms`,
	"--enter-ease": `cubic-bezier(${MOTION_CONFIG.easing.easeOut.join(",")})`,
} as CSSProperties;

/**
 * L'étal — premier écran de la boutique.
 *
 * @description
 * Direction « L'étal » (artifact hero du 2026-08-04, reco C, greffons A + D) :
 * il n'y a PAS de bande hero au-dessus du catalogue. Le bloc titre est la
 * première cellule de la grille des créations (`col-span-2` ≥ lg, largeur
 * entière sinon), et la première chose visible sous la barre est un bijou avec
 * son prix, pas un slogan. Sur un catalogue d'une douzaine de pièces uniques,
 * la marque EST la boutique : une bande de titre pleine hauteur y est le poste
 * le plus cher du premier écran.
 *
 * ## Ce que la structure garantit
 *
 * - **Le `<h1>` ne dépend d'aucun `await`.** Il est rendu hors de la frontière
 *   `Suspense` qui isole la grille : la lecture catalogue ne peut pas retarder
 *   l'élément qui porte le LCP, et c'est pour lui que Fraunces est préchargée.
 * - **Une seule grille.** Le `Suspense` et le fragment de `EtalGrid` ne
 *   produisent aucun nœud DOM : les cartes sont des enfants directs de la même
 *   grille que le bloc titre. C'est tout le concept — sans ça, on retombe sur
 *   une bande + une grille.
 * - **`align-items: start`.** Deux cartes d'une même rangée ne se réalignent
 *   pas sur la plus haute : un étal n'est pas justifié.
 * - **Aucune longueur dérivée de `--navbar-height`.** Elle retombe de 5rem à
 *   4rem quand la navbar de la home se compacte : une hauteur (ou un offset
 *   haut) qui en dérive fait REMONTER le contenu de 16 px au premier pixel
 *   scrollé. L'étal n'a pas de hauteur imposée, et compense la barre fixe avec
 *   `--navbar-height-static`, qui ne bouge pas.
 * - **Pas de `<ul>`.** La grille mélange un bloc titre et des cartes ; en faire
 *   une liste demanderait soit un `display: contents` sur le `<ul>` (qui fait
 *   tomber la sémantique de liste sur plusieurs moteurs), soit d'annoncer le
 *   `<h1>` comme « élément 1 sur 6 ». Chaque `ProductCard` est déjà un
 *   `<article aria-labelledby>` annoncé individuellement.
 */
export function EtalSection({ productsPromise }: { productsPromise: Promise<GetProductsReturn> }) {
	// Pas de `data-accent` sur la section : il ne sert qu'à publier
	// `--section-accent` / `--section-glow` pour SectionHalo, HandDrawnAccent et
	// CursorGlow — l'étal n'en monte aucun. Un attribut d'accent sans
	// consommateur laisse croire qu'une cascade existe. À reposer le jour où
	// l'un d'eux revient.
	return (
		<section
			id="etal"
			aria-labelledby={TITLE_ID}
			className={`${CONTAINER_CLASS} pt-[calc(var(--navbar-height-static)+1.5rem)] pb-12 sm:pt-[calc(var(--navbar-height-static)+2rem)] lg:pt-[calc(var(--navbar-height-static)+2.5rem)] lg:pb-16`}
		>
			<div className="grid grid-cols-2 items-start gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
				<div className="enter-load col-span-2 md:col-span-3 lg:col-span-2" style={HEADING_ENTER}>
					<EtalHeading id={TITLE_ID} />
				</div>

				<Suspense fallback={<EtalGridSkeleton />}>
					<EtalGrid productsPromise={productsPromise} />
				</Suspense>
			</div>
		</section>
	);
}
