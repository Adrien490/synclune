"use client"

import { useEffect, useRef } from "react"
import { useFormContext } from "@/shared/lib/form-context"
import { useScrollToError } from "@/shared/hooks/use-scroll-to-error"

interface FormScrollOnErrorInnerProps {
	isSubmitting: boolean
	hasErrors: boolean
}

function FormScrollOnErrorInner({
	isSubmitting,
	hasErrors,
}: FormScrollOnErrorInnerProps) {
	const { scrollToFirstError } = useScrollToError()
	const wasSubmittingRef = useRef(false)

	useEffect(() => {
		// Scroll vers erreur quand le submit échoue avec des erreurs
		if (wasSubmittingRef.current && !isSubmitting && hasErrors) {
			scrollToFirstError()
		}
		wasSubmittingRef.current = isSubmitting
	}, [isSubmitting, hasErrors, scrollToFirstError])

	return null
}

/**
 * Composant qui scroll automatiquement vers le premier champ en erreur
 * lorsque le formulaire est soumis avec des erreurs de validation.
 *
 * À placer à l'intérieur d'un formulaire TanStack Form.
 *
 * @example
 * ```tsx
 * <form.AppForm>
 *   <FormScrollOnError />
 *   <form.AppField name="email">...</form.AppField>
 *   <SubmitButton />
 * </form.AppForm>
 * ```
 */
export function FormScrollOnError() {
	const form = useFormContext()

	return (
		<form.Subscribe
			selector={(state) => ({
				isSubmitting: state.isSubmitting,
				isValid: state.isValid,
			})}
		>
			{({ isSubmitting, isValid }) => (
				<FormScrollOnErrorInner
					isSubmitting={isSubmitting}
					hasErrors={!isValid}
				/>
			)}
		</form.Subscribe>
	)
}
