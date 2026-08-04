"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { Input } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/lib/form-context";
import { displayNumberValue, parseNumberInputValue } from "./number-input-value";
import { useFieldErrorVisibility } from "./use-field-error-visibility";

interface InputFieldProps extends Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	// Le binding TanStack (`value`/`onChange`/`onBlur`/`name`) et l'`id`
	// (contrat `id === field.name`, cf. field-name-id-contract.regression)
	// appartiennent au composant — un override silencieux désynchroniserait
	// l'input du state du formulaire. `size` (attribut natif) entre en
	// collision avec le variant de taille du composant `Input`.
	"value" | "onChange" | "onBlur" | "name" | "id" | "size"
> {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Marque le champ comme optionnel avec "(Optionnel)" */
	optional?: boolean;
	/** Texte d'aide affiché sous le champ (relié via aria-describedby) */
	description?: string;
	/** Afficher un compteur de caractères (nécessite maxLength) */
	showCounter?: boolean;
}

/**
 * Champ input générique pour formulaires TanStack Form.
 *
 * Supporte les types: text, email, password, number, etc.
 * Pour les champs numériques, les valeurs vides retournent `null`,
 * permettant de distinguer "pas de valeur" de "zéro" (SSOT
 * `number-input-value.ts`). Pour un entier saisi au clavier (quantité,
 * compteur), préférer `type="text"` + `inputMode="numeric"` +
 * `pattern="[0-9]*"` à `type="number"` : pas de molette qui change la
 * valeur, pas de `e`/`+`/`-` acceptés (cf. `adjust-stock-form`).
 *
 * Les erreurs ne s'affichent qu'après blur ou tentative de soumission
 * (`useFieldErrorVisibility`) — la validation, elle, tourne à chaque frappe.
 *
 * Props mobile PWA supportées (transmises à l'input natif):
 * - `inputMode`: Clavier virtuel optimisé (email, tel, numeric, decimal, search)
 * - `enterKeyHint`: Label bouton Entrée (done, next, go, search, send)
 * - `autoComplete`: Autofill navigateur (email, tel, given-name, etc.)
 * - `pattern`: Regex validation HTML5
 * - `spellCheck`: Correction orthographique (false pour email/password)
 * - `autoCapitalize`: Capitalisation auto (none, words, sentences)
 * - `autoCorrect`: Correction auto mobile (off pour noms, adresses, emails)
 *
 * @example
 * ```tsx
 * <form.AppField name="email">
 *   {(field) => (
 *     <field.InputField
 *       label="Email"
 *       type="email"
 *       inputMode="email"
 *       autoComplete="email"
 *       enterKeyHint="next"
 *       spellCheck={false}
 *       placeholder="ton@email.com"
 *       required
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export const InputField = ({
	label,
	required,
	optional,
	description,
	showCounter,
	type,
	maxLength,
	...rest
}: InputFieldProps) => {
	const field = useFieldContext<string | number | null>();
	const hasError = useFieldErrorVisibility(field);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (type === "number") {
			field.handleChange(parseNumberInputValue(e.target));
		} else {
			field.handleChange(e.target.value);
		}
	};

	const fieldValue = field.state.value;
	const displayValue = type === "number" ? displayNumberValue(fieldValue) : (fieldValue ?? "");

	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;
	// Le layout du pied ne dépend que de la config compteur, jamais de l'état
	// d'erreur : brancher sur `hasError` remonterait `FieldError` à chaque
	// bascule et couperait son animation grid-rows.
	const withCounter = Boolean(showCounter && maxLength);

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}
			<Input
				// `rest` d'abord : le binding TanStack et le contrat a11y ci-dessous
				// doivent toujours gagner sur un attribut passé par l'appelant.
				{...rest}
				id={field.name}
				type={type}
				name={field.name}
				value={displayValue}
				onChange={handleChange}
				onBlur={field.handleBlur}
				aria-invalid={hasError}
				aria-describedby={describedBy}
				// `required` n'est volontairement PAS posé en natif : les bulles de
				// validation du navigateur doubleraient l'UI d'erreur maison
				// (cf. use-focus-first-error.ts).
				aria-required={required}
				maxLength={maxLength}
			/>
			{description && (
				<p id={descId!} className="text-muted-foreground text-xs">
					{description}
				</p>
			)}
			{withCounter ? (
				<div className="text-muted-foreground flex justify-between text-xs">
					<FieldError
						id={`${field.name}-error`}
						errors={hasError ? field.state.meta.errors : undefined}
					/>
					<span aria-live="polite">
						{String(displayValue).length}/{maxLength}
					</span>
				</div>
			) : (
				<FieldError
					id={`${field.name}-error`}
					errors={hasError ? field.state.meta.errors : undefined}
				/>
			)}
		</Field>
	);
};
