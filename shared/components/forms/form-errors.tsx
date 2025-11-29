import { cn } from "@/shared/utils/cn";

interface FormErrorsProps {
	errors: unknown[];
	className?: string;
}

/**
 * Composant pour afficher les erreurs globales de formulaire
 *
 * ⚠️ ATTENTION : N'utilisez ce composant que pour les erreurs globales de formulaire
 * (erreurs de validation au niveau du formulaire complet, erreurs serveur, etc.).
 *
 * NE PAS utiliser pour afficher les erreurs de champs individuels, car cela créerait
 * un double affichage avec les composants FieldError qui gèrent déjà ces erreurs.
 *
 * @example
 * // ✅ Bon usage : erreurs globales de formulaire
 * <FormErrors errors={[formState.errorMap.onSubmit]} />
 *
 * @example
 * // ❌ Mauvais usage : toutes les erreurs (double affichage)
 * <form.Subscribe selector={(state) => state.errors}>
 *   {(errors) => <FormErrors errors={errors} />}
 * </form.Subscribe>
 *
 * @param errors Tableau d'erreurs à afficher
 * @param className Classes CSS additionnelles
 */
export function FormErrors({ errors, className }: FormErrorsProps) {
	if (!errors || errors.length === 0) {
		return null;
	}

	return (
		<div
			role="alert"
			className={cn(
				"bg-destructive/15 p-3 rounded-md space-y-1",
				"animate-in fade-in-0 slide-in-from-top-1 duration-200",
				className
			)}
		>
			{errors.map((error, index) => (
				<p key={`form-error-${index}`} className="text-destructive text-sm">
					{String(error)}
				</p>
			))}
		</div>
	);
}
