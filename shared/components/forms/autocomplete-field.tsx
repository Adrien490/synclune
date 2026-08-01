"use client";

import { Autocomplete, type AutocompleteProps } from "@/shared/components/autocomplete";
import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { useFieldContext } from "@/shared/lib/form-context";

type AutocompleteFieldProps<T> = Omit<AutocompleteProps<T>, "name" | "value" | "onChange"> & {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Indique si le champ est requis */
	required?: boolean;
	/** Marque le champ comme optionnel avec "(Optionnel)" */
	optional?: boolean;
	/** Texte d'aide affiché sous le champ, relié via aria-describedby */
	description?: string;
};

/**
 * Champ autocomplete pour formulaires TanStack Form.
 *
 * Wrapper du composant Autocomplete intégré avec le système de formulaires.
 * Gère automatiquement la valeur, les erreurs et l'accessibilité.
 *
 * @example
 * ```tsx
 * <form.AppField name="address">
 *   {(field) => (
 *     <field.AutocompleteField<AddressResult>
 *       label="Adresse"
 *       items={suggestions}
 *       onSelect={(item) => {
 *         field.handleChange(item.label);
 *         form.setFieldValue("postalCode", item.postalCode);
 *       }}
 *       getItemLabel={(item) => item.label}
 *       getItemDescription={(item) => item.city}
 *       isLoading={isPending}
 *       required
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export function AutocompleteField<T>({
	label,
	required,
	optional,
	description,
	onSelect,
	disabled,
	...props
}: AutocompleteFieldProps<T>) {
	const field = useFieldContext<string>();

	const hasError = field.state.meta.errors.length > 0;
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}
			<Autocomplete<T>
				name={field.name}
				value={field.state.value}
				onChange={(value) => field.handleChange(value)}
				onSelect={onSelect}
				disabled={disabled}
				aria-invalid={hasError}
				aria-describedby={describedBy}
				aria-required={required}
				{...props}
			/>
			{description && (
				<p id={descId!} className="text-muted-foreground text-xs">
					{description}
				</p>
			)}
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
}
