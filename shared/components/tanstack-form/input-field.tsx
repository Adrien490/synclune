import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";

interface HTMLInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	/** Label affiché au-dessus du champ */
	label?: string;
}

/**
 * Champ input générique pour formulaires TanStack Form.
 *
 * Supporte les types: text, email, password, number, etc.
 * Pour les champs numériques, les valeurs vides retournent `null`,
 * permettant de distinguer "pas de valeur" de "zéro".
 *
 * Props mobile PWA supportées:
 * - `inputMode`: Clavier virtuel optimisé (email, tel, numeric, decimal, search)
 * - `enterKeyHint`: Label bouton Entrée (done, next, go, search, send)
 * - `autoComplete`: Autofill navigateur (email, tel, given-name, etc.)
 * - `pattern`: Regex validation HTML5
 * - `spellCheck`: Correction orthographique (false pour email/password)
 * - `autoCapitalize`: Capitalisation auto (off, words, sentences)
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
 *       placeholder="votre@email.com"
 *       required
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export const InputField = ({
	disabled,
	label,
	placeholder,
	required,
	type,
	min,
	step,
	value,
	className,
	// Props mobile PWA
	inputMode,
	enterKeyHint,
	autoComplete,
	pattern,
	spellCheck,
	autoCapitalize,
	maxLength,
	...rest
}: HTMLInputProps) => {
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

	// Pour les inputs number, on affiche une chaîne vide si null, NaN ou 0
	const fieldValue = field.state.value;
	const isEmpty =
		fieldValue === undefined ||
		fieldValue === null ||
		fieldValue === 0 ||
		fieldValue === "0" ||
		fieldValue === "" ||
		(typeof fieldValue === "number" && isNaN(fieldValue));
	const displayValue = type === "number" ? (isEmpty ? "" : fieldValue) : fieldValue ?? "";

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
			<Input
				id={field.name}
				min={min}
				step={step}
				type={type}
				disabled={disabled}
				name={field.name}
				placeholder={placeholder}
				value={value ?? displayValue}
				onChange={handleChange}
				onBlur={field.handleBlur}
				aria-invalid={field.state.meta.errors.length > 0}
				aria-describedby={
					field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
				}
				aria-required={required}
				// Props mobile PWA
				inputMode={inputMode}
				enterKeyHint={enterKeyHint}
				autoComplete={autoComplete}
				pattern={pattern}
				spellCheck={spellCheck}
				autoCapitalize={autoCapitalize}
				maxLength={maxLength}
				className={cn("border-input focus:ring-1 focus:ring-primary", className)}
				{...rest}
			/>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
