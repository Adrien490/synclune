interface GalleryCounterProps {
	current: number;
	total: number;
}

/**
 * Numéro de vue « 3 / 7 », posé dans la réserve basse du carton.
 *
 * Il ne flotte plus AU-DESSUS de la photo : dans « Le carnet », le chrome vit
 * sur le carton d'encadrement, jamais sur le bijou. Il est en outre visible à
 * toutes les tailles — l'ancienne pastille de verre noir était `hidden sm:block`,
 * si bien que le mobile n'avait aucun numéro de vue.
 *
 * Purement visuel : l'annonce lecteur d'écran est portée par l'unique région
 * `aria-live` de `gallery.tsx`, d'où le `aria-hidden` (WCAG 4.1.3 — deux
 * annonces de la même information en valent zéro).
 */
export function GalleryCounter({ current, total }: GalleryCounterProps) {
	return (
		<p
			// `data-testid` assumé : `aria-hidden` rend le compteur invisible à tout
			// sélecteur accessible, et l'ancien e2e cherchait un `[class*="counter"]`
			// qui n'a jamais existé — il passait par son repli sur la région live.
			data-testid="gallery-counter"
			// Pas de `tabular-nums` : Fraunces (`font-display`) n'expose pas de feature
			// `tnum` en GSUB, la classe n'y produit RIEN — mesuré sur la refonte du
			// panier (Δ 16,14 px). Sans conséquence ici de toute façon : la loupe est
			// calée par `ms-auto`, la largeur du numéro n'entraîne aucun voisin.
			className="font-display text-foreground text-base leading-none"
			aria-hidden="true"
		>
			{current + 1}
			<span className="text-muted-foreground text-xs"> / {total}</span>
		</p>
	);
}
