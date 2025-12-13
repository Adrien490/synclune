/**
 * Indicateur visuel pour l'item actif (barre horizontale en haut - style iOS)
 */
export function ActiveIndicator() {
	return (
		<span
			className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-10 bg-primary rounded-full motion-safe:animate-in motion-safe:slide-in-from-top-1 motion-safe:duration-200"
			aria-hidden="true"
		/>
	);
}
