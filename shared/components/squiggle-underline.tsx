import { cn } from "@/shared/utils/cn";

/** Tracé partagé par les deux calques — une seule source pour la courbe. */
const SQUIGGLE_PATH = "M2 7 Q 16 2, 30 6 T 56 5 T 82 6";

/**
 * Le trait se dessine au survol de la carte (`group-hover`, gaté `can-hover:`
 * pour neutraliser le sticky-hover iOS) ET au focus clavier
 * (`group-focus-within`) — parité WCAG 2.4.7 verrouillée par
 * `shared/components/__tests__/hover-focus-parity.regression.test.ts`.
 */
const DRAW_CLASSES =
	"can-hover:group-hover:[stroke-dashoffset:0] [stroke-dasharray:120] [stroke-dashoffset:120] group-focus-within:[stroke-dashoffset:0] motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500";

/**
 * Trait « dessiné à la main » sous le titre d'une carte Atelier —
 * l'affordance du lien (équivalent d'un soulignement), partagée par
 * ProductCard (polaroid) et CollectionCard (planche-contact).
 *
 * Contrat d'intégration : l'ancêtre carte porte `group`, le parent direct du
 * SVG est `relative` (le trait se positionne sous la ligne de titre).
 *
 * Le tracé est TOUJOURS en `--primary`, le rose pastel de la marque : ici c'est
 * un ornement, doublé du titre et de la photo, personne ne dépend de sa
 * lisibilité seule.
 *
 * ⚠️ Il a existé un ton `strong` (`--color-brand-rose-strong` + halo pastel),
 * ajouté pour la nav du header où le trait était le SEUL marqueur visible
 * d'`aria-current="page"` — `--primary` y vaut **1,55:1**, sous les 3:1 de
 * WCAG 1.4.11. Ce rose profond a été retiré au profit du pastel (décision design
 * 2026-08-04, cf. `desktop-nav.tsx`) et le ton n'a plus d'appelant. **Ne pas le
 * ré-introduire ici pour un contrôle à état** (point du radio, case cochée) :
 * ceux-là peignent directement en `--color-brand-rose-strong`, règle écrite au
 * § « ROSE PROFOND » d'`app/globals.css` et verrouillée par
 * `token-contrast.regression.test.ts`.
 *
 * @param drawn - Force le trait à l'état DESSINÉ, indépendamment du survol et du
 *   focus. Ajouté pour la nav du header (2026-08-04), où le trait sert aussi
 *   d'indicateur de section courante : sans lui, remplacer l'ancien filet de 2px
 *   par ce trait aurait fait disparaître le repère `aria-current="page"` à l'œil.
 */
export function SquiggleUnderline({ className, drawn }: { className?: string; drawn?: boolean }) {
	const drawClasses = cn(DRAW_CLASSES, drawn && "[stroke-dashoffset:0]");

	return (
		<svg
			// Marqueur stable, PAS décoratif : `NavigationMenuLink` impose `size-4` à
			// tout SVG descendant qui ne porte pas déjà `size-`, et sa spécificité
			// écrase les `h-*`/`w-*` posés ici. Sans cette exclusion, le trait du
			// header rendait 16 × 16 px. Ne pas remplacer par une classe — un `cn()`
			// peut la réordonner, un `data-slot` non.
			data-slot="squiggle-underline"
			viewBox="0 0 84 10"
			// Le trait s'ÉTIRE à la largeur qu'on lui donne au lieu d'être mis à
			// l'échelle uniformément : à sa largeur fixe de 80px il dépassait de
			// moitié les titres courts (« Noël » mesure ~45px en Fraunces text-lg),
			// et ne couvrait qu'un tiers des longs (audit CollectionCard 2026-08-04).
			//
			// ⚠️ Sûr précisément parce que la hauteur du SVG (`h-2.5` = 10px) égale
			// celle du viewBox : l'échelle Y vaut exactement 1, donc l'épaisseur
			// perpendiculaire d'un tracé horizontal ne bouge pas. Ne PAS ajouter
			// `vector-effect="non-scaling-stroke"` pour « sécuriser » ça — il ferait
			// interpréter `stroke-dasharray` en unités écran et casserait
			// l'animation de tracé, dont l'amorce (120) est en unités utilisateur.
			preserveAspectRatio="none"
			aria-hidden="true"
			className={cn("pointer-events-none absolute -bottom-1.5 left-0 h-2.5 w-20", className)}
		>
			<path
				d={SQUIGGLE_PATH}
				fill="none"
				stroke="var(--primary)"
				strokeWidth="2.5"
				strokeLinecap="round"
				className={drawClasses}
			/>
		</svg>
	);
}
