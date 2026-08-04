"use client";

import { cn } from "@/shared/utils/cn";
import { prefetchLightbox } from "./prefetch-lightbox";

interface GalleryZoomButtonProps {
	onOpen: () => void;
	/** Type du média courant — seul le libellé en dépend. */
	mediaType?: "IMAGE" | "VIDEO";
	/** État de la lightbox, pour `aria-expanded`. */
	isOpen?: boolean;
}

/**
 * Loupe dessinée, dans la réserve basse du carton — **seul** contrôle
 * plein écran de la galerie.
 *
 * Elle en avait un jumeau : le slide desktop était lui-même un `<button>`
 * nommé « Ouvrir l'image en plein écran », posé sous celui-ci et déclenchant le
 * même `onOpen`. Deux arrêts au clavier, deux libellés quasi identiques pour un
 * seul geste. Le slide est redevenu un `role="tabpanel"` (ce que les vignettes
 * annoncent déjà via `aria-controls`), et ce bouton porte le libellé unique.
 *
 * Permanente, comme les chevrons : plus de `opacity-0` révélé au survol.
 * Desktop seulement — au doigt, on tape la photo, et le pincement natif de
 * `GalleryPinchZoom` couvre l'agrandissement sur place.
 *
 * ⚠️ **Toujours montée, y compris sur un slide vidéo.** Elle était gatée sur
 * `mediaType === "IMAGE"` : sur un produit `[IMAGE, IMAGE, VIDÉO]`, deux
 * flèches droite depuis la loupe focalisée la démontaient SOUS le focus. Le
 * focus retombait sur `<body>`, or le listener `keydown` de la galerie est
 * attaché à l'élément galerie — un événement émis sur `<body>` ne remonte pas
 * jusqu'à lui. Les flèches, `Home` et `End` mouraient donc en silence, et
 * l'utilisatrice restait bloquée sur la vidéo. La lightbox sait afficher les
 * vidéos (plugin `Video`) : seul le libellé change.
 */

/** Loupe tracée à main levée : cercle irrégulier + manche + croix. */
const LOUPE_BODY =
	"M10.4 3.3 Q16.4 3.1 17.9 9 Q18.6 14.8 12.4 15.9 Q6 16.4 4.6 10.6 Q4.2 4.6 10.4 3.3Z";
const LOUPE_HANDLE = "M16.4 15.1 L20.7 20.2";
const LOUPE_CROSS = "M11.2 7.6v6.1M8.3 10.7h6";

export function GalleryZoomButton({
	onOpen,
	mediaType = "IMAGE",
	isOpen = false,
}: GalleryZoomButtonProps) {
	return (
		<button
			type="button"
			onClick={onOpen}
			onMouseEnter={prefetchLightbox}
			onFocus={prefetchLightbox}
			className={cn(
				// `ms-auto` : la loupe se cale à droite de la réserve basse, le numéro
				// de vue restant à gauche. Elle est toujours le dernier enfant du flex.
				"ms-auto hidden size-11 shrink-0 items-center justify-center rounded-full md:flex",
				"bg-card text-foreground shadow-[0_0_0_1.5px_var(--foreground)]",
				"can-hover:hover:bg-muted",
				"motion-safe:transition-transform motion-safe:duration-[var(--duration-normal)]",
				"can-hover:hover:scale-105 active:scale-95 motion-reduce:transform-none",
				// Sandwich encre/rose/encre — cf. le commentaire de `navigation.tsx`.
				"outline-none focus-visible:shadow-[0_0_0_1.5px_var(--foreground),0_0_0_4.5px_var(--ring),0_0_0_6px_var(--foreground)]",
				// Contraste forcé (Windows High Contrast) : les `box-shadow` y sont
				// supprimés, donc le bord ET l'anneau de focus ci-dessus disparaissent —
				// le jeton devient un aplat `Canvas` sur `Canvas`. Repli en `outline`,
				// aligné sur `bottom-bar.styles.ts` / `count-badge.tsx`.
				"forced-colors:outline forced-colors:outline-1 forced-colors:outline-[CanvasText]",
				"forced-colors:focus-visible:outline-2 forced-colors:focus-visible:outline-offset-2 forced-colors:focus-visible:outline-[Highlight]",
			)}
			aria-label={
				mediaType === "VIDEO" ? "Voir la vidéo en plein écran" : "Voir la photo en plein écran"
			}
			aria-haspopup="dialog"
			aria-expanded={isOpen}
		>
			<svg
				viewBox="0 0 24 24"
				width="22"
				height="22"
				fill="none"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d={LOUPE_BODY}
					stroke="currentColor"
					strokeWidth="2.2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<path d={LOUPE_HANDLE} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
				<path d={LOUPE_CROSS} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
			</svg>
		</button>
	);
}
