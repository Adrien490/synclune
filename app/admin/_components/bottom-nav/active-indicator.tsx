/**
 * Indicateur visuel pour l'item actif (barre horizontale en haut - style iOS)
 */
export function ActiveIndicator() {
	return (
		<span
			className="bg-primary motion-safe:animate-in motion-safe:slide-in-from-top-1 absolute top-0 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full motion-safe:duration-200"
			aria-hidden="true"
		/>
	);
}
