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

/**
 * Plafond du report. Le geste mobile qui ouvre la lightbox passe par
 * `GalleryPinchZoom`, dont `onTap` attend `doubleTapDelay` (**300 ms**) avant de
 * se décider : en garantissant le départ sous 200 ms, le chunk part toujours
 * AVANT que l'ouverture ne soit demandée. C'est ce qui permet de différer sans
 * rouvrir le défaut du 2026-08-04 (« chunk toujours froid au premier tap »).
 */
const PREFETCH_IDLE_TIMEOUT_MS = 200;

/**
 * Laisse passer le travail prioritaire avant de lancer la requête spéculative.
 *
 * `prefetchLightbox` est appelée au `pointerdown` de CHAQUE slide — donc au début
 * de n'importe quel swipe, pas seulement d'un tap qui ouvrira le plein écran. Sur
 * une connexion lente, elle entrait alors en concurrence avec l'image LCP,
 * `usePrefetchImages` et `usePrefetchVideos`, pour un geste qui n'ouvre rien la
 * plupart du temps.
 *
 * `requestIdleCallback` est absent de Safari < 16.4 (~25 % du trafic FR est sur
 * Safari iOS) : repli `setTimeout`, qui rend simplement la tâche macro au lieu de
 * l'attendre vraiment oisive.
 */
function scheduleWhenIdle(task: () => void) {
	if (typeof requestIdleCallback === "function") {
		requestIdleCallback(task, { timeout: PREFETCH_IDLE_TIMEOUT_MS });
		return;
	}
	setTimeout(task, 0);
}

export function prefetchLightbox() {
	if (lightboxPrefetched) return;
	// Posé de façon SYNCHRONE, avant le report : sans ça, les quelques gestes qui
	// tombent dans la même fenêtre d'inactivité planifieraient chacun leur tâche.
	lightboxPrefetched = true;

	scheduleWhenIdle(() => {
		// `.catch` obligatoire : un `void import()` nu remonte un *unhandled rejection*
		// à Sentry pour une requête purement spéculative (coupure réseau, déploiement
		// pendant la session). On relâche aussi le drapeau, sinon un seul échec grille
		// le préchargement pour toute la durée de la page.
		import("@/modules/media/components/media-lightbox").catch(() => {
			lightboxPrefetched = false;
		});
	});
}
