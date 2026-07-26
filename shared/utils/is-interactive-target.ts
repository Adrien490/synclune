/**
 * SSOT de la garde « ne pas intercepter la saisie » pour les raccourcis clavier
 * globaux (listeners `window.keydown`).
 *
 * Trois implémentations divergentes coexistaient : `keyboard-shortcuts-dialog`
 * (INPUT/TEXTAREA/SELECT/contentEditable), `cursor-pagination` (sans SELECT) et
 * `sidebar` (aucune garde — ⌘B se déclenchait en pleine saisie). Un raccourci
 * global doit toujours passer par ici.
 *
 * `SELECT` est inclus : les touches y pilotent la sélection d'option (une
 * `<select>` native réagit aux lettres pour sauter à l'option correspondante).
 */
const INTERACTIVE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function isInteractiveTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	return INTERACTIVE_TAGS.has(target.tagName) || target.isContentEditable;
}
