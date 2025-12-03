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

	return (
		<FieldSet data-invalid={field.state.meta.errors.length > 0}>
			{label && (
				<FieldLabel>
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
				aria-invalid={field.state.meta.errors.length > 0}
				aria-describedby={
					field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
				}
			>
				{options.map((option) => (
					<div key={option.value} className="flex items-center space-x-2">
						<RadioGroupItem value={option.value} id={option.value} />
						<Label htmlFor={option.value}>{option.label}</Label>
					</div>
				))}
			</RadioGroup>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</FieldSet>
	);
};
