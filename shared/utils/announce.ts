/**
 * Canal d'annonce impératif vers les régions sr-only globales (WCAG 4.1.3).
 *
 * ## Pourquoi un canal impératif
 *
 * Une région `aria-live` n'est vocalisée que si elle **existait déjà** dans
 * l'arbre d'accessibilité quand son contenu change. Une région rendue
 * conditionnellement (`{message && <div aria-live>…}`) ou montée en même temps
 * que son texte entre dans l'arbre au même frame que le contenu : les lecteurs
 * d'écran ne l'annoncent pas.
 *
 * Les régions ciblées ici sont montées par `AppToaster` dans le layout racine,
 * donc présentes sur **toutes** les pages avant toute interaction. C'est le seul
 * endroit du projet où cette garantie est structurelle — d'où l'intérêt de s'y
 * brancher plutôt que de rendre une région locale.
 *
 * ## Quand l'utiliser plutôt qu'une région déclarative
 *
 * - Le composant qui porte l'information **se monte** avec elle (état vide
 *   atteint après suppression, badge qui apparaît au premier article, panneau
 *   ouvert par l'action elle-même) → `announce()`.
 * - Le composant est monté en permanence et seul son texte change (compteur de
 *   résultats, pagination) → région déclarative locale, plus simple à tester.
 *
 * Extrait de `shared/utils/toast.ts`, qui en était l'unique appelant : le canal
 * n'a rien de spécifique aux toasts, et les annonces non-toast (ajout au panier,
 * passage à l'état vide) en avaient besoin.
 */

/** Ids des régions rendues par `AppToaster` — SSOT partagée avec `toaster.tsx`. */
export const ANNOUNCE_REGION_IDS = {
	polite: "toast-live-polite",
	assertive: "toast-live-assertive",
} as const;

export type AnnouncePoliteness = keyof typeof ANNOUNCE_REGION_IDS;

/**
 * Annonce un message aux lecteurs d'écran.
 *
 * Séquence clear → `requestAnimationFrame` → set : réassigner le **même** texte
 * ne déclenche aucune annonce, et vider puis remplir dans le même frame est
 * coalescé par le navigateur. Les deux étapes sont nécessaires.
 *
 * No-op silencieux hors navigateur, sur message vide, ou si la région est
 * absente (page rendue sans `AppToaster` — cas des tests unitaires isolés).
 */
export function announce(message: unknown, level: AnnouncePoliteness = "polite"): void {
	if (typeof document === "undefined") return;
	if (typeof message !== "string" || message.length === 0) return;

	const node = document.getElementById(ANNOUNCE_REGION_IDS[level]);
	if (!node) return;

	node.textContent = "";
	requestAnimationFrame(() => {
		node.textContent = message;
	});
}
