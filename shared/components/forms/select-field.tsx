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

interface SelectFieldProps<T extends string> {
	disabled?: boolean;
	label?: string;
	placeholder?: string;
	required?: boolean;
	options: { value: T; label: string }[];
	renderOption?: (option: { value: T; label: string }) => React.ReactNode;
	renderValue?: (value: T) => React.ReactNode;
}

export const SelectField = <T extends string>({
	disabled,
	label,
	placeholder,
	required,
	options,
	renderOption,
	renderValue,
}: SelectFieldProps<T>) => {
	const field = useFieldContext<string | undefined>();

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
				onValueChange={(value) => field.handleChange(value || undefined)}
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
					{renderValue && field.state.value ? (
						renderValue(field.state.value as T)
					) : (
						<SelectValue placeholder={placeholder} />
					)}
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
