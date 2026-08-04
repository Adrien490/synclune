"use client";

import { cn } from "@/shared/utils/cn";

interface GalleryNavigationProps {
	onPrev: () => void;
	onNext: () => void;
	/** `id` du conteneur de slides, pour `aria-controls` (pattern carrousel APG). */
	controlsId?: string;
}

/**
 * Chevrons dessinés, posés à cheval sur le bord du carton.
 *
 * Trois changements par rapport au chrome précédent, tous délibérés :
 *
 * 1. **Permanents.** Ils étaient `opacity-0` jusqu'au survol : au repos, une
 *    galerie desktop n'offrait aucune commande visible, et l'entrée de la souris
 *    déclenchait quatre transitions d'un coup (zoom ×3 + deux flèches + anneau).
 *    Rien à révéler, donc plus de parité survol/focus à tenir ici — les deux
 *    entrées correspondantes ont été retirées de
 *    `hover-focus-parity.regression.test.ts`.
 * 2. **Jeton papier, pas disque rose.** `bg-primary` (`#fdb8e4`) plafonnait à
 *    **1,60:1** contre un fond clair : sur une photo de bijou prise sur fond
 *    blanc, le bouton n'avait aucun bord perceptible (WCAG 1.4.11 demande 3:1).
 *    C'est l'anneau d'encre de 1,5 px qui porte désormais le contraste.
 * 3. **Seuil `md`, pas `sm`.** Le chrome bascule au même endroit que le slide
 *    (`slide.tsx`, `mediaAtLeast("md")`). Avec `sm:`, la plage 640-767 px —
 *    l'iPad Mini portrait, 744 px — recevait le chrome souris par-dessus un
 *    slide tactile qui attend un pincement.
 *
 * ⚠️ L'anneau de focus est un sandwich encre/rose/encre plutôt que l'utility
 * `focus-ring` : celle-ci pose `--ring` (le rose) seul, qui souffre exactement
 * du défaut corrigé au point 2 dès qu'il entoure un jeton blanc.
 */

/** Tracés volontairement irréguliers (léger décrochage au coude) — cf. `HandDrawnAccent`. */
const CHEVRON_LEFT = "M16.1 4.4 Q10.1 7.6 8.5 11.2 Q8 12.5 8.9 13.6 Q11.4 17.1 15.4 19.7";
const CHEVRON_RIGHT = "M7.9 4.4 Q13.9 7.6 15.5 11.2 Q16 12.5 15.1 13.6 Q12.6 17.1 8.6 19.7";

const TOKEN_CLASS = cn(
	"absolute top-1/2 z-10 hidden -translate-y-1/2 md:flex",
	"bg-card size-11 items-center justify-center rounded-full",
	"text-foreground shadow-[0_0_0_1.5px_var(--foreground)]",
	"can-hover:hover:bg-muted",
	"motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)]",
	"can-hover:hover:scale-105 active:scale-95 motion-reduce:transform-none",
	"outline-none focus-visible:shadow-[0_0_0_1.5px_var(--foreground),0_0_0_4.5px_var(--ring),0_0_0_6px_var(--foreground)]",
	// Contraste forcé (Windows High Contrast) : les `box-shadow` y sont supprimés,
	// donc l'anneau d'encre du point 2 ET le sandwich de focus disparaissent d'un
	// coup — le jeton devient un aplat `Canvas` sur `Canvas`, sans bord ni focus
	// visible. Repli en `outline`, aligné sur `bottom-bar.styles.ts`.
	"forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]",
	"forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight]",
);

function DrawnChevron({ d }: { d: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			width="24"
			height="24"
			fill="none"
			aria-hidden="true"
			focusable="false"
		>
			<path d={d} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
		</svg>
	);
}

export function GalleryNavigation({ onPrev, onNext, controlsId }: GalleryNavigationProps) {
	return (
		<>
			<button
				type="button"
				className={cn(TOKEN_CLASS, "-left-3.5")}
				onClick={onPrev}
				aria-label="Image précédente"
				aria-controls={controlsId}
			>
				<DrawnChevron d={CHEVRON_LEFT} />
			</button>
			<button
				type="button"
				className={cn(TOKEN_CLASS, "-right-3.5")}
				onClick={onNext}
				aria-label="Image suivante"
				aria-controls={controlsId}
			>
				<DrawnChevron d={CHEVRON_RIGHT} />
			</button>
		</>
	);
}
