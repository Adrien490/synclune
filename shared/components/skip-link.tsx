/**
 * Lien d'évitement pour l'accessibilité (WCAG 2.4.1)
 *
 * Permet aux utilisateurs de clavier de passer directement au contenu principal
 * sans avoir à naviguer à travers tous les éléments de navigation.
 *
 * Le lien est visuellement caché par défaut et apparaît uniquement au focus.
 */
export function SkipLink() {
	return (
		<a
			href="#main-content"
			className="focus:bg-primary focus:text-primary-foreground focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-(--z-skip) focus:rounded-md focus:px-4 focus:py-2 focus:shadow-lg focus:ring-2 focus:ring-offset-2 focus:outline-none"
		>
			Aller au contenu principal
		</a>
	);
}
