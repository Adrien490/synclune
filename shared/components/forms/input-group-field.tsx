"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { InputGroup, InputGroupInput } from "@/shared/components/ui/input-group";
import { useFieldContext } from "@/shared/lib/form-context";
import { FieldLabel } from "./field-label";

interface InputGroupFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
	/**
	 * Addon(s) à afficher avant ou après le champ.
	 * Utiliser InputGroupAddon avec `align` pour positionner.
	 * @example
	 * <InputGroupAddon align="inline-end">€</InputGroupAddon>
	 */
	children?: React.ReactNode;
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Marque le champ comme optionnel avec "(Optionnel)" */
	optional?: boolean;
	/**
	 * Marque le champ comme requis (aria-required).
	 * La validation reste gérée par le schema Zod.
	 */
	required?: boolean;
	/** Texte d'aide affiché sous le champ (relié via aria-describedby) */
	description?: string;
}

/**
 * Champ input avec addon (prefix/suffix) pour formulaires TanStack Form.
 *
 * Supporte un `label` intégré optionnel (comme InputField).
 * Si omis, utilisez `<FieldLabel htmlFor={field.name}>` manuellement.
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
	label,
	optional,
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
	description,
	...props
}: InputGroupFieldProps) => {
	const field = useFieldContext<string | number | null>();

	const hasError = field.state.meta.errors.length > 0;
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

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
				(typeof field.state.value === "number" && isNaN(field.state.value))
				? ""
				: (field.state.value as number)
			: (field.state.value ?? "");

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}
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
					aria-invalid={hasError}
					aria-describedby={describedBy}
					aria-required={required}
					{...props}
				/>
				{children}
			</InputGroup>
			{description && (
				<p id={descId!} className="text-muted-foreground text-xs">
					{description}
				</p>
			)}
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
