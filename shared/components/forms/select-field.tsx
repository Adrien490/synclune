"use client";

import { useRef } from "react";
import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { NativeSelect, NativeSelectOption } from "@/shared/components/ui/native-select";
import { Button } from "@/shared/components/ui/button";
import { useFieldContext } from "@/shared/lib/form-context";
import { useFieldErrorVisibility } from "./use-field-error-visibility";
import { XIcon } from "@phosphor-icons/react/ssr";

interface SelectFieldProps<T extends string> {
	disabled?: boolean;
	/** Label affiché au-dessus du champ */
	label?: string;
	placeholder?: string;
	required?: boolean;
	/** Marque le champ comme optionnel avec "(Optionnel)" */
	optional?: boolean;
	/** Options disponibles pour la sélection */
	options: { value: T; label: string }[];
	/** Rendu personnalisé pour chaque option dans la liste */
	renderOption?: (option: { value: T; label: string }) => React.ReactNode;
	/** Rendu personnalisé pour la valeur sélectionnée affichée */
	renderValue?: (value: T) => React.ReactNode;
	/** Affiche un bouton pour effacer la sélection */
	clearable?: boolean;
	/** Classes CSS additionnelles pour le conteneur Field */
	className?: string;
	/** HTML autocomplete attribute (pour NativeSelect mobile) */
	autoComplete?: string;
	/** Texte d'aide affiché sous le champ, relié via aria-describedby */
	description?: string;
}

/**
 * Champ de sélection typé pour formulaires TanStack Form.
 *
 * Supporte le typage générique pour les valeurs d'options,
 * le rendu personnalisé, et un bouton pour effacer la sélection.
 *
 * @example
 * ```tsx
 * <form.AppField name="country">
 *   {(field) => (
 *     <field.SelectField
 *       label="Pays"
 *       placeholder="Sélectionner..."
 *       options={[
 *         { value: "fr", label: "France" },
 *         { value: "be", label: "Belgique" },
 *       ]}
 *       clearable
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export const SelectField = <T extends string>({
	disabled,
	label,
	placeholder,
	required,
	optional,
	options,
	renderOption,
	renderValue,
	clearable,
	className,
	autoComplete,
	description,
}: SelectFieldProps<T>) => {
	const field = useFieldContext<T | undefined>();
	const triggerRef = useRef<HTMLButtonElement>(null);

	const hasError = useFieldErrorVisibility(field);
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;
	const selectedOption = options.find((opt) => opt.value === field.state.value);
	// Le `htmlFor` cible le select natif (mobile), invisible au-delà de `md` : le
	// trigger Radix desktop n'héritait donc d'AUCUN nom accessible. On expose le
	// label par `id` pour le lier aux deux contrôles (WCAG 4.1.2 / 3.3.2).
	const labelId = `${field.name}-label`;

	return (
		<Field data-invalid={hasError} className={className}>
			{label && (
				<FieldLabel id={labelId} htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}

			{/* Mobile: NativeSelect */}
			<div className="md:hidden">
				<NativeSelect
					id={field.name}
					name={field.name}
					disabled={disabled}
					value={field.state.value ?? ""}
					onChange={(e) =>
						// Cast sécurisé : value vient des options typées T[]
						field.handleChange((e.target.value || undefined) as T | undefined)
					}
					onBlur={field.handleBlur}
					required={required}
					aria-invalid={hasError}
					aria-describedby={describedBy}
					aria-required={required}
					autoComplete={autoComplete}
					className="w-full"
				>
					{placeholder && (
						<NativeSelectOption value="" disabled={!clearable}>
							{placeholder}
						</NativeSelectOption>
					)}
					{clearable && !placeholder && (
						<NativeSelectOption value="">Aucune sélection</NativeSelectOption>
					)}
					{options.map((option) => (
						<NativeSelectOption key={option.value} value={option.value}>
							{option.label}
						</NativeSelectOption>
					))}
				</NativeSelect>
			</div>

			{/* Desktop: Radix Select */}
			{/*
			 * Le bouton « Effacer » est un FRÈRE du trigger, jamais un descendant :
			 * imbriquer un contrôle interactif dans le `<button>` du SelectTrigger est
			 * invalide en HTML, mal exposé aux lecteurs d'écran, et son handler
			 * Espace/Entrée entrait en conflit avec l'ouverture du Select. Même
			 * disposition que `DateTimeField`.
			 */}
			<div className="hidden items-center gap-2 md:flex">
				<Select
					name={field.name}
					disabled={disabled}
					value={field.state.value ?? ""}
					onValueChange={(value) =>
						// Cast sécurisé : value vient des options typées T[]
						field.handleChange((value || undefined) as T | undefined)
					}
					required={required}
				>
					<SelectTrigger
						ref={triggerRef}
						id={`${field.name}-desktop`}
						className="w-full min-w-0 flex-1"
						onBlur={field.handleBlur}
						aria-invalid={hasError}
						aria-describedby={describedBy}
						aria-required={required}
						aria-labelledby={label ? labelId : undefined}
					>
						<span className="flex-1 truncate text-left">
							{field.state.value ? (
								renderValue ? (
									(renderValue(field.state.value) ?? selectedOption?.label ?? field.state.value)
								) : selectedOption ? (
									renderOption ? (
										renderOption(selectedOption)
									) : (
										selectedOption.label
									)
								) : (
									<span className="text-muted-foreground">{field.state.value}</span>
								)
							) : (
								<SelectValue placeholder={placeholder} />
							)}
						</span>
					</SelectTrigger>
					<SelectContent className="max-h-75 overflow-y-auto">
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{renderOption ? renderOption(option) : option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{clearable && field.state.value && !disabled && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="min-h-11 shrink-0"
						onClick={() => {
							field.handleChange(undefined);
							triggerRef.current?.focus();
						}}
						aria-label="Effacer la sélection"
					>
						<XIcon className="size-4" aria-hidden="true" />
					</Button>
				)}
			</div>

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
