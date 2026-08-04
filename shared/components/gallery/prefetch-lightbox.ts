"use client";

/**
 * Précharge le chunk de `MediaLightbox`, une fois par session de page.
 *
 * ⚠️ Vit ici, et pas dans `zoom-button.tsx` où il est né : le loupe est
 * `hidden md:flex`, donc en dessous de 48rem l'élément est en `display: none` et
 * NI `onMouseEnter` NI `onFocus` ne peuvent se produire. Au doigt, le chemin
 * d'ouverture est le tap sur la photo (`GalleryPinchZoom onTap`) — qui n'avait
 * aucun moyen d'atteindre cette fonction tant qu'elle restait privée. Résultat :
 * sur mobile le chunk était TOUJOURS froid au premier tap.
 *
 * Le drapeau est au niveau module : il survit aux remontages et il est partagé
 * par tous les appelants (loupe desktop, tap mobile).
 */
let lightboxPrefetched = false;

export function prefetchLightbox() {
	if (lightboxPrefetched) return;
	lightboxPrefetched = true;
	// `.catch` obligatoire : un `void import()` nu remonte un *unhandled rejection*
	// à Sentry pour une requête purement spéculative (coupure réseau, déploiement
	// pendant la session). On relâche aussi le drapeau, sinon un seul échec grille
	// le préchargement pour toute la durée de la page.
	import("@/modules/media/components/media-lightbox").catch(() => {
		lightboxPrefetched = false;
	});
}
