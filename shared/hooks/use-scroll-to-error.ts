"use client"

/** Sélecteur CSS pour trouver les champs en erreur */
const ERROR_FIELD_SELECTOR = '[data-error="true"], [aria-invalid="true"]'

/**
 * Hook pour scroller vers le premier champ en erreur.
 *
 * Utilise `requestAnimationFrame` pour attendre que le DOM soit à jour
 * avant de rechercher et scroller vers le champ en erreur.
 *
 * @example
 * ```tsx
 * const { scrollToFirstError } = useScrollToError()
 *
 * const form = useAppForm({
 *   onSubmitInvalid: () => {
 *     scrollToFirstError()
 *   },
 * })
 * ```
 */
export function useScrollToError() {
	const scrollToFirstError = () => {
		requestAnimationFrame(() => {
			const firstError = document.querySelector<HTMLElement>(ERROR_FIELD_SELECTOR)
			if (firstError) {
				firstError.scrollIntoView({ behavior: "smooth", block: "center" })
				firstError.focus()
			}
		})
	}

	return { scrollToFirstError }
}
