"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { RatingStars } from "@/shared/components/ui/rating-stars";
import { useFieldContext } from "@/shared/lib/form-context";

interface RatingFieldProps {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Marque le champ comme requis */
	required?: boolean;
	/** Taille des étoiles */
	size?: "sm" | "md" | "lg";
	/** Afficher le texte de la note (ex: "5 étoiles") */
	showRatingText?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * Champ rating (étoiles) pour formulaires TanStack Form.
 *
 * Permet de sélectionner une note de 1 à 5 étoiles.
 * L'état est entièrement géré par TanStack Form (pas de useState local).
 *
 * @example
 * ```tsx
 * <form.AppField name="rating">
 *   {(field) => (
 *     <field.RatingField
 *       label="Votre note"
 *       size="lg"
 *       showRatingText
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export const RatingField = ({
	label,
	required,
	size = "lg",
	showRatingText = true,
	className,
}: RatingFieldProps) => {
	const field = useFieldContext<number>();

	return (
		<Field data-invalid={field.state.meta.errors.length > 0} className={className}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} className="text-center">
					{label}
				</FieldLabel>
			)}
			<div className="flex flex-col items-center gap-2">
				<RatingStars
					rating={field.state.value}
					size={size}
					interactive
					onChange={field.handleChange}
				/>
				{showRatingText && (
					<span className="text-sm text-muted-foreground">
						{field.state.value} étoile{field.state.value > 1 ? "s" : ""}
					</span>
				)}
			</div>
			<input type="hidden" name={field.name} value={field.state.value} />
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
