"use client";

import { FieldError, FieldSet } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { useFieldContext } from "@/shared/lib/form-context";

interface RadioOption {
	value: string;
	label: string;
}

interface RadioGroupFieldProps {
	options: RadioOption[];
	label?: string;
	/** Accessible label fallback when no visible label is provided */
	"aria-label"?: string;
	/** Texte d'aide affiché sous le champ, relié via aria-describedby */
	description?: string;
	required?: boolean;
	disabled?: boolean;
	onValueChangeCallback?: (value: string) => void;
}

export const RadioGroupField = ({
	options,
	label,
	"aria-label": ariaLabel,
	description,
	required,
	disabled,
	onValueChangeCallback,
}: RadioGroupFieldProps) => {
	const field = useFieldContext<string>();
	const labelId = `${field.name}-label`;
	const errorId = `${field.name}-error`;
	const hasErrors = field.state.meta.errors.length > 0;
	const descId = description ? `${field.name}-desc` : null;
	const describedBy = [descId, hasErrors ? errorId : null].filter(Boolean).join(" ") || undefined;

	return (
		<FieldSet data-invalid={hasErrors}>
			{label && (
				<FieldLabel required={required}>
					<span id={labelId}>{label}</span>
				</FieldLabel>
			)}
			<RadioGroup
				disabled={disabled}
				value={field.state.value}
				onValueChange={(value) => {
					field.handleChange(value);
					onValueChangeCallback?.(value);
				}}
				className="flex flex-wrap gap-4"
				aria-invalid={hasErrors}
				aria-required={required}
				aria-label={label ? undefined : ariaLabel}
				aria-labelledby={label ? labelId : undefined}
				aria-describedby={describedBy}
			>
				{options.map((option) => {
					const optionId = `${field.name}-${option.value}`;
					return (
						<Label
							key={option.value}
							htmlFor={optionId}
							// `min-h-11` : la puce Radix fait 16px et le `py-2` ne portait la
							// ligne qu'à ~32px, sous la cible tactile de 44px (WCAG 2.5.8).
							// Aligné sur `RadioFilterItem`, qui traite déjà le même motif.
							className="-mx-3 -my-2 flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2"
						>
							<RadioGroupItem value={option.value} id={optionId} />
							<span>{option.label}</span>
						</Label>
					);
				})}
			</RadioGroup>
			{description && (
				<p id={descId!} className="text-muted-foreground text-xs">
					{description}
				</p>
			)}
			<FieldError id={errorId} errors={field.state.meta.errors} />
		</FieldSet>
	);
};
