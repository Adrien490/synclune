"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "@/shared/components/forms/field-label";
import { inputBaseStyles } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/lib/form-context";
import { useFieldErrorVisibility } from "./use-field-error-visibility";
import { cn } from "@/shared/utils/cn";
import type { Country } from "react-phone-number-input";
import type { Ref } from "react";
import PhoneInputWithFlags from "./phone-input-lazy";

interface PhoneFieldProps {
	disabled?: boolean;
	label?: string;
	placeholder?: string;
	required?: boolean;
	optional?: boolean;
	defaultCountry?: Country;
	className?: string;
	/** Texte d'aide affiché sous le champ, relié via aria-describedby */
	description?: string;
	/** Label du bouton Entrée sur clavier mobile (done, next, go, search, send) */
	enterKeyHint?: "done" | "next" | "go" | "search" | "send";
}

function CustomInput({
	className,
	ref,
	...props
}: React.ComponentProps<"input"> & { ref?: Ref<HTMLInputElement> }) {
	return (
		<input
			ref={ref}
			type="tel"
			inputMode="tel"
			autoComplete="tel"
			autoCapitalize="off"
			autoCorrect="off"
			data-slot="input"
			className={cn(inputBaseStyles, "rounded-l-none border-l-0", className)}
			{...props}
		/>
	);
}

/**
 * Champ de saisie de numéro de téléphone international avec sélecteur de pays.
 *
 * Utilise react-phone-number-input pour le formatage automatique
 * et la sélection du pays avec drapeaux.
 *
 * Les numéros sont stockés au format E.164 (ex: +33612345678).
 *
 * @example
 * ```tsx
 * <form.AppField name="phone">
 *   {(field) => (
 *     <field.PhoneField
 *       label="Téléphone"
 *       required
 *       defaultCountry="FR"
 *       placeholder="06 12 34 56 78"
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export const PhoneField = ({
	disabled,
	label,
	placeholder,
	required,
	optional,
	defaultCountry = "FR",
	className,
	description,
	enterKeyHint,
}: PhoneFieldProps) => {
	const field = useFieldContext<string | undefined>();

	const hasError = useFieldErrorVisibility(field);
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
			<PhoneInputWithFlags
				id={field.name}
				name={field.name}
				international
				countryCallingCodeEditable={false}
				defaultCountry={defaultCountry}
				placeholder={placeholder}
				value={field.state.value ?? ""}
				onChange={(value) => {
					field.handleChange(value ?? "");
				}}
				onBlur={field.handleBlur}
				disabled={disabled}
				inputComponent={CustomInput}
				aria-invalid={hasError}
				aria-describedby={describedBy}
				aria-required={required}
				className={cn("PhoneInput--synclune", className)}
				numberInputProps={{ enterKeyHint }}
			/>
			{description && (
				<p id={descId!} className="text-muted-foreground text-xs">
					{description}
				</p>
			)}
			<FieldError
				id={`${field.name}-error`}
				errors={hasError ? field.state.meta.errors : undefined}
			/>
		</Field>
	);
};
