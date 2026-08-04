/**
 * Skeleton aligné sur la structure réelle de `ProductCard` (anti-CLS).
 *
 * SSOT consommé par les sections qui rendent une grille / un carousel de
 * ProductCard derrière un Suspense (CartRecommendations, RelatedProducts, l'étal
 * de la home, …).
 *
 * Les dimensions reflètent celles de ProductCard (redesign Atelier 2026-08-03) :
 * - article : cadre polaroid `rounded-md border-2 p-2 pb-0 sm:p-2.5 sm:pb-0`
 * - media : `aspect-4/5 rounded-sm` (ratio unifié tous viewports)
 * - légende : `flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4`
 *   → eyebrow (`text-2xs` → h-3) + titre + matière (`text-xs` → h-4)
 *   + prix (~h-5, `mt-0.5`) + CTA panier mobile (`h-11` pleine largeur,
 *   `sm:hidden`, précédé de `pt-1`)
 *
 * ⚠️ La LÉGENDE compte autant que le ratio du média (audit UI/UX de l'étal,
 * 2026-08-04). Elle s'arrêtait au prix : il manquait la matière et le CTA
 * mobile. **Mesuré** dans un banc à 390 px de large, cellule de 171 px : la
 * carte réelle faisait 375 px (titre sur 1 ligne) à 399 px (2 lignes) contre
 * **287 px** de squelette — soit 88 à 112 px de décalage par carte au swap, sur
 * la page dont `e2e/performance.spec.ts` mesure le CLS. Après alignement :
 * 10 px et 34 px.
 *
 * Le titre réserve **2 lignes sous `sm`** (`h-12` = 2 × 24 px) et une seule
 * au-delà (`sm:h-7`). Ce n'est pas une approximation prudente mais le cas
 * DOMINANT : à 171 px de large en `text-base`, un titre de bijou tient rarement
 * sur une ligne, alors qu'à 270 px en `text-lg` il en tient presque toujours
 * une seule. Mesuré, ce choix ramène le décalage mobile à −14 px (titre court)
 * / +10 px (titre long) au lieu de +10 / +34 avec une seule ligne réservée.
 *
 * Le ratio du média est verrouillé par
 * `skeleton-card-ratio-parity.regression.test.ts` ; la légende ne peut pas
 * l'être structurellement, elle se relit à la main en face de `product-card.tsx`.
 *
 * Les pastilles de couleur ne sont PAS réservées : elles ne s'affichent que si
 * le produit a plus d'une couleur, on ne peut pas le savoir d'avance.
 */
export function ProductCardSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="product-card-skeleton bg-card grid rounded-md border-2 border-transparent p-2 pb-0 shadow-sm sm:p-2.5 sm:pb-0"
		>
			<div className="bg-muted aspect-4/5 rounded-sm motion-safe:animate-pulse" />

			<div className="flex flex-col gap-1.5 px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				<div className="bg-muted h-3 w-24 rounded motion-safe:animate-pulse" />
				<div className="bg-muted h-12 w-full rounded motion-safe:animate-pulse sm:h-7" />
				<div className="bg-muted h-4 w-16 rounded motion-safe:animate-pulse" />
				<div className="bg-muted mt-0.5 h-5 w-20 rounded motion-safe:animate-pulse" />
				<div className="bg-muted mt-auto h-11 w-full rounded-full motion-safe:animate-pulse sm:hidden" />
			</div>
		</div>
	);
}
