"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { InputGroup, InputGroupInput } from "@/shared/components/ui/input-group";
import { useFieldContext } from "@/shared/lib/form-context";

interface InputGroupFieldProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	/** Addon (InputGroupAddon) à afficher avant ou après le champ */
	children?: React.ReactNode;
	required?: boolean;
}

/**
 * Champ input avec addon (prefix/suffix) pour formulaires TanStack Form.
 *
 * N'inclut pas de label - utilisez FieldLabel séparément si nécessaire.
 * Pour les champs numériques, les valeurs vides retournent `null`.
 *
 * @example
 * ```tsx
 * <form.AppField name="price">
 *   {(field) => (
 *     <field.InputGroupField type="number" min={0} step={0.01}>
 *       <InputGroupAddon position="end">€</InputGroupAddon>
 *     </field.InputGroupField>
 *   )}
 * </form.AppField>
 * ```
 */
export const InputGroupField = ({
	disabled,
	placeholder,
	required,
	type,
	min,
	max,
	step,
	children,
	...props
}: InputGroupFieldProps) => {
	const field = useFieldContext<string | number | null>();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (type === "number") {
			const numValue = e.target.valueAsNumber;
			// Si la valeur est NaN (champ vide), on retourne null pour les champs optionnels
			field.handleChange(isNaN(numValue) ? null : numValue);
		} else {
			field.handleChange(e.target.value);
		}
	};

	// Pour les inputs number, on affiche une chaîne vide uniquement si null, undefined ou NaN
	// Le 0 doit pouvoir être affiché et saisi
	const displayValue: string | number =
		type === "number"
			? field.state.value === null ||
				field.state.value === undefined ||
				(typeof field.state.value === "number" && isNaN(field.state.value))
				? ""
				: (field.state.value as number)
			: (field.state.value as string) ?? "";

	return (
		<Field data-invalid={field.state.meta.errors.length > 0}>
			<InputGroup>
				<InputGroupInput
					id={field.name}
					min={min}
					max={max}
					step={step}
					type={type}
					disabled={disabled}
					name={field.name}
					placeholder={placeholder}
					value={displayValue}
					onChange={handleChange}
					onBlur={field.handleBlur}
					inputMode={type === "number" ? "decimal" : undefined}
					aria-invalid={field.state.meta.errors.length > 0}
					aria-describedby={
						field.state.meta.errors.length > 0
							? `${field.name}-error`
							: undefined
					}
					aria-required={required}
					{...props}
				/>
				{children}
			</InputGroup>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
