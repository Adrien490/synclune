"use client";

import { FieldError, FieldLabel, FieldSet } from "@/shared/components/ui/field";
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
	required?: boolean;
	disabled?: boolean;
	onValueChangeCallback?: (value: string) => void;
}

export const RadioGroupField = ({
	options,
	label,
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
				<FieldLabel id={labelId}>
					{label}
					{required && (
						<span className="text-destructive ml-1" aria-label="requis">
							*
						</span>
					)}
				</FieldLabel>
			)}
			<RadioGroup
				disabled={disabled}
				value={field.state.value}
				onValueChange={(value) => {
					field.handleChange(value);
					onValueChangeCallback?.(value);
				}}
				className="flex gap-4 flex-wrap"
				aria-invalid={hasErrors}
				aria-labelledby={label ? labelId : undefined}
				aria-describedby={hasErrors ? errorId : undefined}
			>
				{options.map((option) => {
					const optionId = `${field.name}-${option.value}`;
					return (
						<Label
							key={option.value}
							htmlFor={optionId}
							className="flex items-center gap-2 cursor-pointer py-2 -my-2"
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
