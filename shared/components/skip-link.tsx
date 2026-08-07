interface SkipLinkProps {
	/** ID de la cible (sans #). Défaut: "main-content" */
	targetId?: string;
	/** Libellé affiché au focus. Défaut: "Aller au contenu principal" */
	label?: string;
}

/**
 * Lien d'évitement pour l'accessibilité (WCAG 2.4.1)
 *
 * Permet aux utilisateurs de clavier de passer directement au contenu principal
 * sans avoir à naviguer à travers tous les éléments de navigation.
 *
 * Le lien est visuellement caché par défaut et apparaît uniquement au focus.
 *
 * ## Deux défauts corrigés le 2026-08-07 (audit a11y checkout)
 *
 * 1. **Le focus était invisible.** Le lien peignait
 *    `focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none` :
 *    l'`outline-none` annulait l'outline `--foreground` (19,5:1) posé par le base
 *    layer de `globals.css`, ne laissant que l'anneau `--ring` — le rose pastel à
 *    **1,55:1**, très en dessous des 3:1 de WCAG 1.4.11. Mesuré au rendu :
 *    `outline-style: none` sur le PREMIER élément tabbable de chaque page.
 *    Le scanner `focus-ring-is-the-only-focus-ink` ne pouvait pas le voir — il ne
 *    cherchait que la variante `focus-visible:`, pas `focus:`.
 *
 * 2. **`focus:` au lieu de `focus-visible:`** faisait apparaître le lien à la
 *    souris (un clic sur un `<a>` le focuse), alors qu'il ne sert qu'au clavier.
 *
 * ⚠️ Ne PAS remonter un second lien d'évitement dans un layout de segment : ce
 * composant est monté à la racine (`app/layout.tsx`) et couvre donc toutes les
 * routes. `/paiement` et `/suivi-commande` en ajoutaient un, d'où deux liens
 * concurrents vers le même `#main-content`.
 */
export function SkipLink({
	targetId = "main-content",
	label = "Aller au contenu principal",
}: SkipLinkProps = {}) {
	return (
		<a
			href={`#${targetId}`}
			className="focus-ring bg-primary text-primary-foreground sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-(--z-skip) focus-visible:rounded-md focus-visible:px-4 focus-visible:py-2 focus-visible:shadow-lg"
		>
			{label}
		</a>
	);
}
