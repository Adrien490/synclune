"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";

interface TextareaFieldProps extends React.ComponentProps<"textarea"> {
	label?: string;
	/** Marque le champ comme optionnel avec "(Optionnel)" */
	optional?: boolean;
}

/**
 * Champ textarea pour formulaires TanStack Form.
 *
 * Props mobile PWA supportées:
 * - `enterKeyHint`: Label bouton Entrée (done, send, etc.)
 * - `spellCheck`: Correction orthographique
 * - `autoComplete`: Autofill navigateur
 * - `autoCapitalize`: Capitalisation auto (sentences par défaut)
 * - `autoCorrect`: Correction auto mobile (off pour noms, adresses)
 */
export const TextareaField = ({
	disabled,
	label,
	rows,
	placeholder,
	required,
	optional,
	className,
	// Props mobile PWA
	enterKeyHint,
	spellCheck,
	autoComplete,
	autoCapitalize,
	autoCorrect,
	maxLength,
	...rest
}: TextareaFieldProps) => {
	const field = useFieldContext<string>();

	return (
		<Field data-invalid={field.state.meta.errors.length > 0}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}
			<Textarea
				id={field.name}
				disabled={disabled}
				name={field.name}
				placeholder={placeholder}
				value={field.state.value}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={field.handleBlur}
				rows={rows}
				aria-invalid={field.state.meta.errors.length > 0}
				aria-describedby={
					field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
				}
				aria-required={required}
				// Props mobile PWA
				enterKeyHint={enterKeyHint}
				spellCheck={spellCheck}
				autoComplete={autoComplete}
				autoCapitalize={autoCapitalize}
				autoCorrect={autoCorrect}
				maxLength={maxLength}
				className={cn("border-input focus:ring-1 focus:ring-primary", className)}
				{...rest}
			/>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
