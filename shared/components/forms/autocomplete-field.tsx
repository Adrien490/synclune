"use client";

import {
	Autocomplete,
	type AutocompleteProps,
} from "@/shared/components/autocomplete";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { useFieldContext } from "@/shared/lib/form-context";

type AutocompleteFieldProps<T> = Omit<
	AutocompleteProps<T>,
	"name" | "value" | "onChange"
> & {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Indique si le champ est requis */
	required?: boolean;
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
	onSelect,
	disabled,
	...props
}: AutocompleteFieldProps<T>) {
	const field = useFieldContext<string>();

	return (
		<Field data-invalid={field.state.meta.errors.length > 0}>
			{label && (
				<FieldLabel htmlFor={field.name}>
					{label}
					{required && (
						<span className="text-destructive ml-1" aria-label="requis">
							*
						</span>
					)}
				</FieldLabel>
			)}
			<Autocomplete<T>
				name={field.name}
				value={field.state.value ?? ""}
				onChange={(value) => field.handleChange(value)}
				onSelect={onSelect}
				disabled={disabled}
				{...props}
			/>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
}
