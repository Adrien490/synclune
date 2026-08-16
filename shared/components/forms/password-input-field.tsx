"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { Input } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/lib/form-context";
import { useFieldErrorVisibility } from "./use-field-error-visibility";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { EyeIcon, EyeSlashIcon } from "@phosphor-icons/react/ssr";
import { useState } from "react";

interface PasswordInputFieldProps extends Omit<
	React.InputHTMLAttributes<HTMLInputElement>,
	"type" | "size"
> {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Texte d'aide affiché sous le champ (relié via aria-describedby) */
	description?: string;
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
	description,
	className,
	autoComplete,
	...rest
}: PasswordInputFieldProps) => {
	const field = useFieldContext<string>();
	const [showPassword, setShowPassword] = useState(false);

	const { visible: hasError, announce } = useFieldErrorVisibility(field);
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		field.handleChange(e.target.value);
	};

	const toggleButton = (
		<button
			type="button"
			onClick={() => {
				triggerHaptic("selection");
				setShowPassword(!showPassword);
			}}
			// ⚠️ `size-6` (24px) est le MINIMUM WCAG 2.5.8 AA, et il porte sur la boîte
			// du bouton lui-même : le `after:inset-[-12px]` élargit bien la zone
			// cliquable à 44px, mais axe mesure `getBoundingClientRect` de l'élément
			// et voyait donc 20px (icône 16 + p-0.5). Violation réelle relevée sur
			// /admin/connexion par l'audit e2e du 2026-08-16 — l'icône reste à 16px.
			className="focus-ring text-muted-foreground hover:text-foreground relative inline-flex size-6 items-center justify-center rounded-sm transition-colors after:absolute after:inset-[-10px] after:content-[''] motion-safe:transition-colors"
			aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
			aria-pressed={showPassword}
		>
			{showPassword ? (
				<EyeSlashIcon className="size-4" aria-hidden="true" />
			) : (
				<EyeIcon className="size-4" aria-hidden="true" />
			)}
		</button>
	);

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required}>
					{label}
				</FieldLabel>
			)}
			<Input
				id={field.name}
				type={showPassword ? "text" : "password"}
				disabled={disabled}
				name={field.name}
				placeholder={placeholder}
				value={field.state.value}
				onChange={handleChange}
				onBlur={field.handleBlur}
				aria-invalid={hasError}
				aria-describedby={describedBy}
				aria-required={required}
				autoComplete={autoComplete}
				// Dévoiler le mot de passe bascule `type` en "text" : sans ces trois
				// attributs, iOS/Android appliquent alors majuscule automatique,
				// autocorrection et vérification orthographique à un mot de passe en
				// clair — la saisie est réécrite sous les doigts de l'utilisateur, et
				// le mot de passe atterrit dans le dictionnaire personnel du clavier.
				autoCapitalize="none"
				autoCorrect="off"
				spellCheck={false}
				className={cn("pr-10", className)}
				endIcon={toggleButton}
				endIconInteractive
				{...rest}
			/>
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
