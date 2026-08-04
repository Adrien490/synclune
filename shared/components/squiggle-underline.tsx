import { cn } from "@/shared/utils/cn";

/**
 * Trait rose « dessiné à la main » sous le titre d'une carte Atelier —
 * l'affordance du lien (équivalent d'un soulignement), partagée par
 * ProductCard (polaroid) et CollectionCard (planche-contact).
 *
 * Le trait se dessine au survol de la carte (`group-hover`, gaté `can-hover:`
 * pour neutraliser le sticky-hover iOS) ET au focus clavier
 * (`group-focus-within`) — parité WCAG 2.4.7 verrouillée par
 * `shared/components/__tests__/hover-focus-parity.regression.test.ts`.
 *
 * Contrat d'intégration : l'ancêtre carte porte `group`, le parent direct du
 * SVG est `relative` (le trait se positionne sous la ligne de titre).
 *
 * @param drawn - Force le trait à l'état DESSINÉ, indépendamment du survol et du
 *   focus. Ajouté pour la nav du header (2026-08-04), où le trait sert aussi
 *   d'indicateur de section courante : sans lui, remplacer l'ancien filet de 2px
 *   par ce trait aurait fait disparaître le repère `aria-current="page"` à l'œil.
 *   Purement additif — les usages carte n'y touchent pas et gardent le
 *   comportement survol/focus verrouillé par `hover-focus-parity.regression`.
 */
export function SquiggleUnderline({ className, drawn }: { className?: string; drawn?: boolean }) {
	return (
		<svg
			viewBox="0 0 84 10"
			aria-hidden="true"
			className={cn("pointer-events-none absolute -bottom-1.5 left-0 h-2.5 w-20", className)}
		>
			<path
				d="M2 7 Q 16 2, 30 6 T 56 5 T 82 6"
				fill="none"
				stroke="var(--primary)"
				strokeWidth="2.5"
				strokeLinecap="round"
				className={cn(
					"can-hover:group-hover:[stroke-dashoffset:0] [stroke-dasharray:120] [stroke-dashoffset:120] group-focus-within:[stroke-dashoffset:0] motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500",
					drawn && "[stroke-dashoffset:0]",
				)}
			/>
		</svg>
	);
}
