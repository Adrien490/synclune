"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { InputGroup, InputGroupInput } from "@/shared/components/ui/input-group";
import { useFieldContext } from "@/shared/lib/form-context";

interface InputGroupFieldProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	/**
	 * Addon(s) à afficher avant ou après le champ.
	 * Utiliser InputGroupAddon avec `align` pour positionner.
	 * @example
	 * <InputGroupAddon align="inline-end">€</InputGroupAddon>
	 */
	children?: React.ReactNode;
	/**
	 * Marque le champ comme requis (aria-required).
	 * La validation reste gérée par le schema Zod.
	 */
	required?: boolean;
}

/**
 * Champ input avec addon (prefix/suffix) pour formulaires TanStack Form.
 *
 * **Note:** Ce composant n'inclut pas de label intégré, contrairement à InputField.
 * Cela permet une flexibilité de layout (ex: label au-dessus avec espacement custom).
 * Utilisez `<FieldLabel htmlFor={field.name}>` si nécessaire.
 *
 * Pour les champs numériques :
 * - Les valeurs vides retournent `null`
 * - La valeur `0` est correctement affichée et préservée
 *
 * @example
 * ```tsx
 * <form.AppField name="price">
 *   {(field) => (
 *     <div className="space-y-2">
 *       <FieldLabel htmlFor="price">Prix</FieldLabel>
 *       <field.InputGroupField type="number" min={0} step={0.01}>
 *         <InputGroupAddon align="inline-end">€</InputGroupAddon>
 *       </field.InputGroupField>
 *     </div>
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
	inputMode,
	enterKeyHint,
	autoComplete,
	pattern,
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
					inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)}
					enterKeyHint={enterKeyHint}
					autoComplete={autoComplete}
					pattern={pattern}
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
