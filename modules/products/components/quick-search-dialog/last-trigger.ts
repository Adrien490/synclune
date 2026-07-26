/**
 * Module-scoped reference to the element that opened the quick search dialog
 * (the navbar trigger button, or whatever held focus when ⌘K was pressed).
 *
 * Captured *before* the dialog steals focus so it can be restored on close via
 * `onCloseAutoFocus`. The trigger button blurs itself before opening (to avoid a
 * Radix aria-hidden warning), so `document.activeElement` is no longer reliable
 * by the time the dialog mounts — hence this explicit handoff.
 */
export const lastTrigger: { el: HTMLElement | null } = { el: null };

/**
 * Enregistre l'élément déclencheur. **Passer par ce setter plutôt que d'écrire
 * `lastTrigger.el` directement** : selon l'endroit où l'affectation est écrite,
 * le compilateur React la refuse (`react-hooks/immutability` — « Modifying a
 * variable defined outside a component or hook is not allowed »). Un appel de
 * fonction ne déclenche pas la règle, et tous les points d'entrée du dialog
 * partagent ainsi un seul idiome.
 */
export function setLastTrigger(el: HTMLElement | null): void {
	lastTrigger.el = el;
}
