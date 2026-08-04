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
 */
export function SquiggleUnderline({ className }: { className?: string }) {
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
				className="can-hover:group-hover:[stroke-dashoffset:0] [stroke-dasharray:120] [stroke-dashoffset:120] group-focus-within:[stroke-dashoffset:0] motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500"
			/>
		</svg>
	);
}
