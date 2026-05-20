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
