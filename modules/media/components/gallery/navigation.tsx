"use client";

import { HAND_DRAWN_STROKES } from "@/shared/components/hand-drawn/constants";
import { CHEVRON_LEFT_PATH, CHEVRON_RIGHT_PATH } from "@/shared/components/hand-drawn/paths";
import { cn } from "@/shared/utils/cn";
import { GALLERY_TOKEN_CLASS } from "./token.styles";

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
 * La surface du jeton (bord d'encre, survol, anneau de focus, repli contraste
 * forcé) vit dans `token.styles.ts`, partagée avec la loupe — c'est là qu'est
 * expliqué le choix du sandwich de focus plutôt que de l'utility `focus-ring`.
 * Ici, seule la GÉOMÉTRIE.
 *
 * ⚠️ **« Vue », pas « Image »** : la galerie mélange photos et vidéos, et une
 * flèche ne sait pas ce qu'elle va atteindre — la nommer « Image suivante »
 * ment une fois sur trois sur un produit `[IMAGE, IMAGE, VIDÉO]`. Le libellé
 * SPÉCIFIQUE appartient à ce qui connaît le média courant : la région live de
 * `gallery.tsx` et le déclencheur de plein écran (`zoom-button.tsx`), qui
 * dérivent tous deux du `mediaType`, comme `media-lightbox.tsx`.
 */

// Tracés dans la SSOT du vocabulaire main (shared/components/hand-drawn/paths.ts).
const CHEVRON_LEFT = CHEVRON_LEFT_PATH;
const CHEVRON_RIGHT = CHEVRON_RIGHT_PATH;

/** Géométrie propre aux chevrons : à cheval sur le bord du carton, à mi-hauteur. */
const CHEVRON_TOKEN_CLASS = cn(
	"absolute top-1/2 z-10 hidden -translate-y-1/2 md:flex",
	GALLERY_TOKEN_CLASS,
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
			<path
				d={d}
				stroke="currentColor"
				strokeWidth={HAND_DRAWN_STROKES.marqueur}
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function GalleryNavigation({ onPrev, onNext, controlsId }: GalleryNavigationProps) {
	return (
		<>
			<button
				type="button"
				className={cn(CHEVRON_TOKEN_CLASS, "-left-3.5")}
				onClick={onPrev}
				aria-label="Vue précédente"
				aria-controls={controlsId}
			>
				<DrawnChevron d={CHEVRON_LEFT} />
			</button>
			<button
				type="button"
				className={cn(CHEVRON_TOKEN_CLASS, "-right-3.5")}
				onClick={onNext}
				aria-label="Vue suivante"
				aria-controls={controlsId}
			>
				<DrawnChevron d={CHEVRON_RIGHT} />
			</button>
		</>
	);
}
