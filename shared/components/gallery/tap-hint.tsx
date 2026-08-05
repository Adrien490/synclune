"use client";

import { useGestureHintOnce } from "@/shared/hooks/use-gesture-hint-once";

interface GalleryTapHintProps {
	/** Passe à `false` dès que le plein écran a été ouvert une fois. */
	enabled?: boolean;
}

/**
 * « Appuie pour agrandir » — une fois par appareil, sous `md` uniquement.
 *
 * ## Le trou qu'il bouche
 *
 * Sous 48 rem, la galerie n'offrait que la photo, le numéro de vue (`aria-hidden`,
 * donc muet aux yeux qui cherchent un bouton comme aux lecteurs d'écran) et la
 * bande de vignettes : la loupe et les chevrons sont `hidden md:flex`. Le
 * tap-pour-agrandir est une convention e-commerce, mais **rien** ne l'annonçait —
 * sur le viewport majoritaire d'une boutique dont l'argument est la photo. Le
 * seul indice qui existait (`pinch-zoom.tsx`, « +/- zoomer • Flèches déplacer »)
 * est `hidden sm:block` ET `opacity-0 focus-within:opacity-100` : il ne peut
 * apparaître que dans la bande 40–48 rem, après un tap. Sur téléphone il est mort.
 *
 * ## Pourquoi dans la réserve basse, et pas sur la photo
 *
 * Deux raisons, et la première est un invariant du dépôt :
 *
 * 1. Depuis « Le carnet », le chrome vit sur le carton d'encadrement, jamais sur
 *    le bijou. Un indice posé sur la photo prendrait le contre-pied du redesign
 *    que `gallery-chrome-off-photo.regression.test.ts` verrouille.
 * 2. **Zéro CLS.** La réserve basse est une ligne flex qui porte déjà le numéro de
 *    vue, à la même taille de texte : ajouter puis retirer l'indice ne change pas
 *    sa hauteur. Un overlay dans la boîte photo n'aurait aucun ancrage de flux, et
 *    une bannière au-dessus des vignettes les décalerait à sa disparition — avec,
 *    au passage, le miroir `product-main-skeleton.tsx` à répercuter.
 *
 * ## Deux réglages qui ne se devinent pas
 *
 * - **`respectsReducedMotion: false`.** Le hook coupe ses hints sous
 *   `prefers-reduced-motion` parce que ses appelants historiques ANIMENT. Ici
 *   c'est du texte statique : le couper retirerait de l'information à quelqu'un
 *   qui n'a demandé qu'à réduire le mouvement.
 * - **`aria-hidden`.** Le chemin lecteur d'écran existe déjà et dit mieux :
 *   l'`aria-label` de `GalleryPinchZoom` annonce « Double-tapez ou appuyez sur +
 *   pour zoomer. Entrée pour ouvrir en plein écran. » Répéter l'information ici en
 *   ferait une deuxième annonce concurrente, exactement ce que le compteur évite
 *   déjà (WCAG 4.1.3).
 *
 * L'indice disparaît au premier passage en plein écran — l'utilisatrice a appris —
 * et **pas** sur minuterie : un texte qui s'efface tout seul dans le dos de
 * quelqu'un qui le lit est pire que pas d'indice du tout.
 */
export function GalleryTapHint({ enabled = true }: GalleryTapHintProps) {
	const show = useGestureHintOnce("gallery-tap-to-zoom", {
		enabled,
		respectsReducedMotion: false,
	});

	// ⚠️ `enabled` doit être relu ICI, pas seulement passé au hook. Une fois sa
	// décision figée (`resolved`), `useGestureHintOnce` renvoie `true` pour toute
	// la session : repasser `enabled` à `false` ne le fait pas revenir en arrière.
	// Sans cette seconde garde, l'indice survivrait à la première ouverture du
	// plein écran — précisément le moment où il n'a plus rien à apprendre.
	if (!enabled || !show) return null;

	return (
		<p
			data-testid="gallery-tap-hint"
			className="text-muted-foreground ms-auto flex items-center gap-1.5 text-xs md:hidden"
			aria-hidden="true"
		>
			<svg viewBox="0 0 24 24" width="14" height="14" fill="none" focusable="false">
				{/* Même loupe tracée à main levée que `zoom-button.tsx`, en plus petit. */}
				<path
					d="M10.4 3.3 Q16.4 3.1 17.9 9 Q18.6 14.8 12.4 15.9 Q6 16.4 4.6 10.6 Q4.2 4.6 10.4 3.3Z"
					stroke="currentColor"
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path
					d="M16.4 15.1 L20.7 20.2"
					stroke="currentColor"
					strokeWidth="2.2"
					strokeLinecap="round"
				/>
			</svg>
			Appuie pour agrandir
		</p>
	);
}
