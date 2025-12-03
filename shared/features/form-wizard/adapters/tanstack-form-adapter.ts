import type { FormLike } from "../types"

/**
 * Type représentant un formulaire TanStack Form.
 *
 * Utilise `any` intentionnellement car TanStack Form utilise des types génériques
 * stricts où les noms de champs sont des unions littérales typées (ex: "title" | "description").
 * Un adapter doit accepter n'importe quel formulaire indépendamment de ses champs.
 *
 * Le duck typing de l'implémentation garantit la présence des méthodes nécessaires
 * à l'exécution : validateField, getFieldMeta, getFieldValue, state.isDirty.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TanStackFormInstance = any

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
 * import { createTanStackFormAdapter } from "@/shared/features/form-wizard/adapters"
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
