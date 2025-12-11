"use client";

import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

interface PasswordInputFieldProps
	extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
	/** Label affiché au-dessus du champ */
	label?: string;
}

/**
 * Champ mot de passe avec toggle de visibilité pour formulaires TanStack Form.
 *
 * Inclut un bouton pour afficher/masquer le mot de passe, optimisé pour mobile.
 *
 * @example
 * ```tsx
 * <form.AppField name="password">
 *   {(field) => (
 *     <field.PasswordInputField
 *       label="Mot de passe"
 *       autoComplete="new-password"
 *       required
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export const PasswordInputField = ({
	disabled,
	label,
	placeholder,
	required,
	className,
	autoComplete,
	...rest
}: PasswordInputFieldProps) => {
	const field = useFieldContext<string>();
	const [showPassword, setShowPassword] = useState(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		field.handleChange(e.target.value);
	};

	const toggleButton = (
		<button
			type="button"
			onClick={() => setShowPassword(!showPassword)}
			className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-sm p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2"
			aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
			tabIndex={-1}
		>
			{showPassword ? (
				<EyeOff className="size-4" aria-hidden="true" />
			) : (
				<Eye className="size-4" aria-hidden="true" />
			)}
		</button>
	);

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
				type={showPassword ? "text" : "password"}
				disabled={disabled}
				name={field.name}
				placeholder={placeholder}
				value={field.state.value ?? ""}
				onChange={handleChange}
				onBlur={field.handleBlur}
				aria-invalid={field.state.meta.errors.length > 0}
				aria-describedby={
					field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
				}
				aria-required={required}
				autoComplete={autoComplete}
				className={cn("pr-10", className)}
				endIcon={toggleButton}
				{...rest}
			/>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
