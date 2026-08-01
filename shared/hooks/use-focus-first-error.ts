"use client";

import { useRef } from "react";

import { triggerHaptic } from "@/shared/hooks/use-haptic";

function prefersReducedMotion() {
	if (typeof window === "undefined") return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** `true` si l'élément est effectivement rendu (pas d'ancêtre `display:none`). */
function isRendered(element: HTMLElement): boolean {
	// `checkVisibility` est la primitive dédiée dans les navigateurs modernes.
	if (typeof element.checkVisibility === "function") return element.checkVisibility();
	return element.getClientRects().length > 0;
}

/**
 * Premier élément effectivement rendu de la liste.
 *
 * Plusieurs champs partagés rendent une variante mobile ET une variante desktop
 * en permanence, la visibilité étant purement CSS (`md:hidden` / `hidden md:flex`
 * — cf. `SelectField`). Focaliser ou scroller un `display:none` échoue en
 * silence, d'où ce filtre.
 *
 * ⚠️ Repli sur le premier candidat quand AUCUN n'est jugé rendu : sous jsdom il
 * n'y a pas de moteur de layout (`getClientRects()` renvoie toujours une liste
 * vide, les classes Tailwind ne sont pas chargées), donc sans ce repli le hook
 * cesserait de focaliser quoi que ce soit en test. Le repli préserve exactement
 * le comportement historique dans cet environnement.
 */
export function findFirstVisible(elements: Iterable<HTMLElement>): HTMLElement | null {
	const candidates = Array.from(elements);
	for (const element of candidates) {
		if (isRendered(element)) return element;
	}
	return candidates[0] ?? null;
}

/**
 * Finds the first field marked with `aria-invalid="true"` (or failing native
 * HTML5 validation), scrolls it into view, focuses it, and fires an `"error"`
 * haptic pulse.
 *
 * Works with both:
 * - TanStack Form validators — `aria-invalid="true"` is set on the input by
 *   the `InputField`, `SelectField`, etc. field components after validation.
 *   C'est le chemin principal, celui qu'emprunte `useGatedFormSubmit`.
 * - Native HTML5 constraints — `onInvalidCapture` attrape le premier événement
 *   `invalid` qui remonte le formulaire (la validation native du navigateur
 *   précède l'événement `submit`, donc ce chemin se déclenche AVANT `onSubmit`).
 *
 * ⚠️ Quelles contraintes natives atteignent réellement le DOM à travers les
 * champs partagés — vérifié, non supposé :
 * - `pattern`, `type="email"`, `min` / `step` : **oui**, `InputField` les
 *   forwarde tels quels (ex. `pattern="[0-9]{5}"` sur le code postal des
 *   formulaires adresse — c'est ce qui rend `onInvalidCapture` utile là-bas).
 * - `required` sur un `<select>` natif : **oui** (`SelectField`).
 * - `required` sur un `<input>` : **NON**. `InputField` consomme la prop pour
 *   l'astérisque du label et `aria-required`, sans jamais poser l'attribut
 *   natif — délibéré, sinon les bulles de validation du navigateur
 *   doubleraient l'UI d'erreur maison. Ne pas conclure de cette absence que
 *   `onInvalidCapture` est du code mort.
 * - Un `<form noValidate>` (checkout) désactive tout ce chemin : là, seul
 *   `focusFirstInvalid()` opère.
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
const focusElement = (element: HTMLElement) => {
	element.scrollIntoView({
		block: "center",
		behavior: prefersReducedMotion() ? "auto" : "smooth",
	});
	// `focus()` accepte un options-bag sur tous les éléments focusables
	// (HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, HTMLButtonElement,
	// contenteditable…). Le guard couvre le cas d'un nœud spécial où l'API
	// est absente (rare — SVG sans tabindex, certains custom elements).
	const focusableEl = element as HTMLElement & { focus?: (opts?: FocusOptions) => void };
	if (typeof focusableEl.focus === "function") {
		focusableEl.focus({ preventScroll: true });
	}
	triggerHaptic("error");
};

export function useFocusFirstError() {
	const formRef = useRef<HTMLFormElement>(null);
	const debounceRef = useRef(false);

	const focusFirstInvalid = () => {
		const root = formRef.current;
		if (!root) return false;
		// Premier invalide VISIBLE, pas simplement premier dans l'ordre du DOM :
		// `SelectField` rend ses deux variantes en permanence (le <select> natif
		// `md:hidden` d'abord, le trigger Radix `hidden md:flex` ensuite) et pose
		// `aria-invalid` sur les deux. En desktop, cibler la première occurrence
		// revenait à `focus()` + `scrollIntoView()` sur un `display:none` — deux
		// no-op silencieux, le focus restait où il était.
		const first = findFirstVisible(root.querySelectorAll<HTMLElement>('[aria-invalid="true"]'));
		if (!first) return false;
		focusElement(first);
		return true;
	};

	const onInvalidCapture: React.FormEventHandler<HTMLFormElement> = (event) => {
		if (debounceRef.current) return;
		const target = event.target;
		if (!(target instanceof HTMLElement)) return;
		debounceRef.current = true;
		focusElement(target);
		window.setTimeout(() => {
			debounceRef.current = false;
		}, 300);
	};

	return { formRef, focusFirstInvalid, onInvalidCapture };
}
