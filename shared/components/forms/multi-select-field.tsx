"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { MultiSelect, type MultiSelectOption } from "@/shared/components/multi-select";
import { useFieldContext } from "@/shared/lib/form-context";
import { useFieldErrorVisibility } from "./use-field-error-visibility";

interface MultiSelectFieldProps {
	label?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	options: MultiSelectOption[];
	/** Texte d'aide affiché sous le champ, relié via aria-describedby */
	description?: string;
}

export const MultiSelectField = ({
	label,
	placeholder = "Sélectionner",
	required,
	disabled,
	options,
	description,
}: MultiSelectFieldProps) => {
	const field = useFieldContext<string[]>();

	const hasError = useFieldErrorVisibility(field);
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required}>
					{label}
				</FieldLabel>
			)}

			<MultiSelect
				id={field.name}
				options={options}
				value={field.state.value}
				onValueChange={(values) => field.handleChange(values)}
				placeholder={placeholder}
				disabled={disabled}
				aria-invalid={hasError}
				aria-describedby={describedBy}
				aria-required={required}
			/>

			{description && (
				<p id={descId!} className="text-muted-foreground text-xs">
					{description}
				</p>
			)}

			{/*
			 * `MultiSelect` ne rend aucun contrôle natif : sans cet input caché, le
			 * champ était absent du `FormData` d'une soumission `action=` — donc
			 * silencieusement vide côté Server Action. Sérialisé en JSON, comme les
			 * `colorIds` / `materialIds` des formulaires SKU.
			 */}
			<input type="hidden" name={field.name} value={JSON.stringify(field.state.value)} />

			<FieldError
				id={`${field.name}-error`}
				errors={hasError ? field.state.meta.errors : undefined}
			/>
		</Field>
	);
};
