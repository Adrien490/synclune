"use client";

import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";
import { X } from "lucide-react";

interface SelectFieldProps<T extends string> {
	disabled?: boolean;
	/** Label affiché au-dessus du champ */
	label?: string;
	placeholder?: string;
	required?: boolean;
	/** Options disponibles pour la sélection */
	options: { value: T; label: string }[];
	/** Rendu personnalisé pour chaque option dans la liste */
	renderOption?: (option: { value: T; label: string }) => React.ReactNode;
	/** Rendu personnalisé pour la valeur sélectionnée affichée */
	renderValue?: (value: T) => React.ReactNode;
	/** Affiche un bouton pour effacer la sélection */
	clearable?: boolean;
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
	options,
	renderOption,
	renderValue,
	clearable,
}: SelectFieldProps<T>) => {
	const field = useFieldContext<T | undefined>();

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
			<Select
				name={field.name}
				disabled={disabled}
				value={field.state.value ?? ""}
				onValueChange={(value) => field.handleChange((value || undefined) as T | undefined)}
				required={required}
			>
				<SelectTrigger
					id={field.name}
					className="w-full"
					onBlur={field.handleBlur}
					aria-invalid={field.state.meta.errors.length > 0}
					aria-describedby={
						field.state.meta.errors.length > 0
							? `${field.name}-error`
							: undefined
					}
					aria-required={required}
				>
					<div className="flex items-center w-full min-w-0">
						<span className="flex-1 truncate text-left">
							{renderValue && field.state.value ? (
								renderValue(field.state.value)
							) : (
								<SelectValue placeholder={placeholder} />
							)}
						</span>
						{clearable && field.state.value && (
							<button
								type="button"
								className={cn(
									"inline-flex items-center justify-center h-6 w-6 ml-1 mr-0.5 shrink-0 rounded-sm",
									"hover:bg-accent hover:text-accent-foreground",
									"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
									"cursor-pointer"
								)}
								onPointerDown={(e) => {
									e.preventDefault();
									e.stopPropagation();
								}}
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									field.handleChange(undefined);
								}}
								aria-label="Effacer la sélection"
							>
								<X className="h-3.5 w-3.5" />
							</button>
						)}
					</div>
				</SelectTrigger>
				<SelectContent className="max-h-[300px] overflow-y-auto">
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{renderOption ? renderOption(option) : option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
