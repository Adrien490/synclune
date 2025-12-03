import type { FormLike } from "../types"

/**
 * Type minimal pour un formulaire compatible avec le wizard
 * Conçu pour fonctionner avec TanStack Form et autres librairies similaires
 */
interface WizardCompatibleForm {
	validateField: (name: string, cause: unknown) => Promise<void> | void
	getFieldMeta: (name: string) => { errors: string[] } | undefined
	getFieldValue?: (name: string) => unknown
	state: {
		isDirty: boolean
	}
}

/**
 * Crée un adaptateur FormLike à partir d'un formulaire TanStack Form
 *
 * @example
 * ```tsx
 * import { createTanStackFormAdapter } from "@/shared/components/wizard/adapters"
 *
 * const form = useAppForm<ProductFormInput>({ ... })
 *
 * const wizard = useFormWizard({
 *   steps: PRODUCT_STEPS,
 *   form: createTanStackFormAdapter(form),
 * })
 * ```
 */
export function createTanStackFormAdapter(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: WizardCompatibleForm | any
): FormLike {
	return {
		validateField: async (name: string, opts?: { cause: string }) => {
			// TanStack Form expects the cause directly, not wrapped in an object
			await form.validateField(name, opts?.cause ?? "change")
		},
		getFieldMeta: (name: string) => {
			return form.getFieldMeta(name)
		},
		getFieldValue: form.getFieldValue
			? (name: string) => form.getFieldValue(name)
			: undefined,
		isDirty: () => form.state.isDirty,
	}
}
