"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { MultiSelect, type MultiSelectOption } from "@/shared/components/multi-select";
import { useFieldContext } from "@/shared/lib/form-context";

interface MultiSelectFieldProps {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Placeholder quand aucune sélection */
	placeholder?: string;
	/** Champ requis */
	required?: boolean;
	/** Désactiver le champ */
	disabled?: boolean;
	/** Options disponibles pour la sélection */
	options: MultiSelectOption[];
	/** Nombre maximum de badges affichés (défaut: 3) */
	maxCount?: number;
	/** Masquer l'option "Tout sélectionner" */
	hideSelectAll?: boolean;
	/** Activer la recherche (défaut: true) */
	searchable?: boolean;
}

/**
 * Champ de sélection multiple pour formulaires TanStack Form.
 *
 * Wrapper autour du composant MultiSelect avec intégration Field/Error.
 *
 * @example
 * ```tsx
 * <form.AppField name="collections">
 *   {(field) => (
 *     <field.MultiSelectField
 *       label="Collections"
 *       placeholder="Sélectionner des collections"
 *       options={collections.map((c) => ({ value: c.id, label: c.name }))}
 *       maxCount={2}
 *       hideSelectAll
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export const MultiSelectField = ({
	label,
	placeholder = "Sélectionner",
	required,
	disabled,
	options,
	maxCount = 3,
	hideSelectAll,
	searchable = true,
}: MultiSelectFieldProps) => {
	const field = useFieldContext<string[]>();

	const hasError = field.state.meta.errors.length > 0;

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required}>
					{label}
				</FieldLabel>
			)}

			<MultiSelect
				options={options}
				defaultValue={field.state.value}
				onValueChange={(values) => field.handleChange(values)}
				placeholder={placeholder}
				disabled={disabled}
				maxCount={maxCount}
				hideSelectAll={hideSelectAll}
				searchable={searchable}
				aria-invalid={hasError}
				aria-describedby={hasError ? `${field.name}-error` : undefined}
				aria-required={required}
			/>

			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
