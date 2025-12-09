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
			className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
		>
			Aller au contenu principal
		</a>
	);
}
