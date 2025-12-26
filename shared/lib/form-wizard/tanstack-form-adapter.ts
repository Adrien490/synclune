import type { FormLike } from "@/shared/types/form-wizard"

/**
 * Interface minimale pour l'adaptateur TanStack Form.
 *
 * Définit les méthodes requises par l'adapter sans coupler aux types
 * génériques stricts de TanStack Form (où les noms de champs sont des
 * unions littérales typées comme "title" | "description").
 *
 * Cette interface permet d'accepter n'importe quel formulaire TanStack
 * tout en conservant la type-safety à la compilation.
 */
interface TanStackFormInstance {
	validateField: (name: string, cause?: string) => Promise<void>
	getFieldMeta: (name: string) => { errors: string[] } | undefined
	getFieldValue?: (name: string) => unknown
	state?: { isDirty: boolean }
}

/**
 * Crée un adaptateur FormLike à partir d'un formulaire TanStack Form.
 *
 * L'adapter convertit l'API de TanStack Form vers l'interface FormLike
 * utilisée par le wizard pour la validation et l'état du formulaire.
 *
 * @param form - Instance de formulaire TanStack Form (useAppForm, useForm, etc.)
 * @returns Adaptateur FormLike compatible avec useFormWizard
 *
 * @example
 * ```tsx
 * import { createTanStackFormAdapter } from "@/shared/lib/form-wizard"
 *
 * const form = useAppForm<ProductFormInput>({ ... })
 *
 * const wizard = useFormWizard({
 *   steps: PRODUCT_STEPS,
 *   form: createTanStackFormAdapter(form),
 * })
 * ```
 */
export function createTanStackFormAdapter(form: TanStackFormInstance): FormLike {
	// Validate required methods for better debugging
	if (!form?.validateField) {
		throw new Error(
			"[FormWizard] Adapter requires validateField method on form instance"
		)
	}
	if (!form?.getFieldMeta) {
		throw new Error(
			"[FormWizard] Adapter requires getFieldMeta method on form instance"
		)
	}

	// Extract optional properties to enable proper type narrowing
	const { getFieldValue } = form
	const stateIsDirty = form.state?.isDirty

	return {
		validateField: async (name: string, opts?: { cause: string }) => {
			// TanStack Form expects the cause directly, not wrapped in an object
			await form.validateField(name, opts?.cause ?? "change")
		},
		getFieldMeta: (name: string) => {
			return form.getFieldMeta(name)
		},
		getFieldValue: getFieldValue
			? (name: string) => getFieldValue(name)
			: undefined,
		isDirty: stateIsDirty !== undefined
			? () => form.state!.isDirty
			: undefined,
	}
}
