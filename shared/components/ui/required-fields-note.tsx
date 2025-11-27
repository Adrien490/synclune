import { cn } from "@/shared/utils/cn";

export interface RequiredFieldsNoteProps {
	/**
	 * Classes CSS additionnelles
	 */
	className?: string;
	/**
	 * Texte personnalisé
	 * @default "Les champs marqués d'un astérisque (*) sont obligatoires."
	 */
	text?: string;
}

/**
 * Composant d'indication pour les champs obligatoires dans les formulaires
 *
 * Affiche un message discret mais visible indiquant que les champs avec *
 * sont obligatoires. Optimisé pour l'accessibilité.
 *
 * @example
 * ```tsx
 * <form>
 *   <RequiredFieldsNote />
 *   <Input label="Email *" />
 *   <Input label="Nom" />
 * </form>
 * ```
 */
export function RequiredFieldsNote({
	className,
	text = "Les champs marqués d'un astérisque (*) sont obligatoires.",
}: RequiredFieldsNoteProps) {
	return (
		<p
			className={cn(
				"text-xs text-muted-foreground",
				"flex items-center gap-1.5",
				className
			)}
			role="status"
			aria-label="Indication des champs obligatoires"
		>
			<span className="text-destructive font-semibold" aria-hidden="true">
				*
			</span>
			<span>{text}</span>
		</p>
	);
}
