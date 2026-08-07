"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { InputGroup, InputGroupInput } from "@/shared/components/ui/input-group";
import { useFieldContext } from "@/shared/lib/form-context";
import { FieldLabel } from "./field-label";
import { displayNumberValue, parseNumberInputValue } from "./number-input-value";
import { useFieldErrorVisibility } from "./use-field-error-visibility";

interface InputGroupFieldProps extends Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	// Le binding TanStack et l'`id` (contrat `id === field.name`,
	// cf. field-name-id-contract.regression) appartiennent au composant.
	"value" | "onChange" | "onBlur" | "name" | "id"
> {
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
 * Pour les champs numériques (SSOT `number-input-value.ts`) :
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
	label,
	optional,
	required,
	type,
	children,
	inputMode,
	description,
	...rest
}: InputGroupFieldProps) => {
	const field = useFieldContext<string | number | null>();

	const { visible: hasError, announce } = useFieldErrorVisibility(field);
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (type === "number") {
			field.handleChange(parseNumberInputValue(e.target));
		} else {
			field.handleChange(e.target.value);
		}
	};

	const displayValue =
		type === "number" ? displayNumberValue(field.state.value) : (field.state.value ?? "");

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}
			<InputGroup>
				<InputGroupInput
					// `rest` d'abord : le binding TanStack et le contrat a11y ci-dessous
					// doivent toujours gagner sur un attribut passé par l'appelant.
					{...rest}
					id={field.name}
					type={type}
					name={field.name}
					value={displayValue}
					onChange={handleChange}
					onBlur={field.handleBlur}
					inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)}
					aria-invalid={hasError}
					aria-describedby={describedBy}
					aria-required={required}
				/>
				{children}
			</InputGroup>
			{description && (
				<p id={descId!} className="text-muted-foreground text-xs">
					{description}
				</p>
			)}
			<FieldError
				live={announce}
				id={`${field.name}-error`}
				errors={hasError ? field.state.meta.errors : undefined}
			/>
		</Field>
	);
};
