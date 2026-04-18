"use client";

import { useCallback, useRef } from "react";

import { triggerHaptic } from "@/shared/hooks/use-haptic";

/**
 * Finds the first field marked with `aria-invalid="true"` (or failing native
 * HTML5 validation), scrolls it into view, focuses it, and fires an `"error"`
 * haptic pulse.
 *
 * Works with both:
 * - TanStack Form validators — `aria-invalid="true"` is set on the input by
 *   the `InputField`, `SelectField`, etc. field components after validation.
 * - Native HTML5 `required` / `pattern` / `type="email"` — the `onInvalidCapture`
 *   handler catches the first invalid event bubbling up through the form.
 *
 * Usage — TanStack Form (post-submit manual call):
 * ```tsx
 * const { formRef, focusFirstInvalid } = useFocusFirstError();
 *
 * return (
 *   <form
 *     ref={formRef}
 *     onSubmit={async (e) => {
 *       e.preventDefault();
 *       await form.handleSubmit();
 *       if (!form.state.isValid) focusFirstInvalid();
 *     }}
 *   >
 *     …
 *   </form>
 * );
 * ```
 *
 * Usage — native HTML5 validation:
 * ```tsx
 * const { formRef, onInvalidCapture } = useFocusFirstError();
 *
 * return (
 *   <form ref={formRef} onInvalidCapture={onInvalidCapture}>
 *     <input required />
 *   </form>
 * );
 * ```
 *
 * Accessibility:
 * - WCAG 3.3.1 (Error Identification) — shifts focus to the first invalid input.
 * - `preventScroll: true` on focus so we control scroll behavior (smooth centered).
 * - Haptic `"error"` on Android / PWA, silently no-op on iOS Safari and desktop.
 */
export function useFocusFirstError() {
	const formRef = useRef<HTMLFormElement>(null);
	const debounceRef = useRef(false);

	const focusElement = useCallback((element: HTMLElement) => {
		element.scrollIntoView({ block: "center", behavior: "smooth" });
		if (typeof (element as HTMLInputElement).focus === "function") {
			(element as HTMLInputElement).focus({ preventScroll: true });
		}
		triggerHaptic("error");
	}, []);

	const focusFirstInvalid = useCallback(() => {
		const root = formRef.current;
		if (!root) return false;
		const first = root.querySelector<HTMLElement>(
			"[aria-invalid='true']:not([aria-invalid='false'])",
		);
		if (!first) return false;
		focusElement(first);
		return true;
	}, [focusElement]);

	const onInvalidCapture: React.FormEventHandler<HTMLFormElement> = useCallback(
		(event) => {
			if (debounceRef.current) return;
			const target = event.target;
			if (!(target instanceof HTMLElement)) return;
			debounceRef.current = true;
			focusElement(target);
			window.setTimeout(() => {
				debounceRef.current = false;
			}, 300);
		},
		[focusElement],
	);

	return { formRef, focusFirstInvalid, onInvalidCapture };
}
