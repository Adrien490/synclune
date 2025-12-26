"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "@/shared/components/forms/field-label";
import { inputBaseStyles } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";
import PhoneInput from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import "react-phone-number-input/style.css";
import { forwardRef } from "react";

interface PhoneFieldProps {
	disabled?: boolean;
	label?: string;
	placeholder?: string;
	required?: boolean;
	optional?: boolean;
	defaultCountry?: Country;
	className?: string;
	description?: string;
}

const CustomInput = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
	({ className, ...props }, ref) => {
		return (
			<input
				ref={ref}
				type="tel"
				autoComplete="tel"
				autoCorrect="off"
				data-slot="input"
				className={cn(inputBaseStyles, "rounded-l-none border-l-0", className)}
				{...props}
			/>
		);
	}
);
CustomInput.displayName = "CustomInput";

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
}: PhoneFieldProps) => {
	const field = useFieldContext<string | undefined>();

	const hasError = field.state.meta.errors.length > 0;

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}
			<PhoneInput
				id={field.name}
				name={field.name}
				international
				countryCallingCodeEditable={false}
				defaultCountry={defaultCountry}
				placeholder={placeholder}
				value={field.state.value ?? ""}
				onChange={(value) => field.handleChange(value ?? undefined)}
				onBlur={field.handleBlur}
				disabled={disabled}
				inputComponent={CustomInput}
				flags={flags}
				aria-invalid={hasError}
				aria-describedby={hasError ? `${field.name}-error` : undefined}
				aria-required={required}
				className={cn("PhoneInput--synclune", className)}
			/>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
			{description && (
				<p className="text-xs text-muted-foreground mt-1.5">{description}</p>
			)}
		</Field>
	);
};

export type { PhoneFieldProps };
