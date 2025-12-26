"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "@/shared/components/forms/field-label";
import { useFieldContext } from "@/shared/lib/form-context";
import { ReviewMediaUpload, type ReviewMediaItem } from "./review-media-upload";

interface ReviewMediaFieldProps {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Désactiver l'upload pendant le submit */
	disabled?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
}

/**
 * Champ d'upload de photos pour avis, intégré à TanStack Form.
 *
 * Wrapper du composant ReviewMediaUpload qui utilise useFieldContext
 * pour gérer l'état via TanStack Form au lieu de useState local.
 *
 * @example
 * ```tsx
 * <form.Field name="media">
 *   {() => (
 *     <ReviewMediaField
 *       label="Photos (optionnel)"
 *       disabled={isPending}
 *     />
 *   )}
 * </form.Field>
 * ```
 */
export const ReviewMediaField = ({
	label,
	disabled,
	className,
}: ReviewMediaFieldProps) => {
	const field = useFieldContext<ReviewMediaItem[]>();

	return (
		<Field data-invalid={field.state.meta.errors.length > 0} className={className}>
			{label && (
				<FieldLabel htmlFor={field.name} optional>
					{label}
				</FieldLabel>
			)}
			<ReviewMediaUpload
				media={field.state.value ?? []}
				onChange={field.handleChange}
				disabled={disabled}
			/>
			<input type="hidden" name={field.name} value={JSON.stringify(field.state.value ?? [])} />
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
