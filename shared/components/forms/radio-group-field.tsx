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
	required?: boolean;
	disabled?: boolean;
	onValueChangeCallback?: (value: string) => void;
}

export const RadioGroupField = ({
	options,
	label,
	"aria-label": ariaLabel,
	required,
	disabled,
	onValueChangeCallback,
}: RadioGroupFieldProps) => {
	const field = useFieldContext<string>();
	const labelId = `${field.name}-label`;
	const errorId = `${field.name}-error`;
	const hasErrors = field.state.meta.errors.length > 0;

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
				aria-label={label ? undefined : ariaLabel}
				aria-labelledby={label ? labelId : undefined}
				aria-describedby={hasErrors ? errorId : undefined}
			>
				{options.map((option) => {
					const optionId = `${field.name}-${option.value}`;
					return (
						<Label
							key={option.value}
							htmlFor={optionId}
							className="-my-2 flex cursor-pointer items-center gap-2 py-2"
						>
							<RadioGroupItem value={option.value} id={optionId} />
							<span>{option.label}</span>
						</Label>
					);
				})}
			</RadioGroup>
			<FieldError id={errorId} errors={field.state.meta.errors} />
		</FieldSet>
	);
};
