import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/shared/components/ui/field";
import { useFieldContext } from "@/shared/lib/form-context";
import { ReactNode } from "react";

interface CheckboxFieldProps extends React.ComponentProps<typeof Checkbox> {
	label?: ReactNode;
}

export const CheckboxField = ({
	disabled,
	label,
	required,
	checked,
	onCheckedChange,
}: CheckboxFieldProps) => {
	const field = useFieldContext<boolean>();

	return (
		<Field
			orientation="horizontal"
			data-invalid={field.state.meta.errors.length > 0}
			className="items-start"
		>
			<input
				type="hidden"
				name={field.name}
				value={String(checked ?? field.state.value ?? false)}
			/>
			<Checkbox
				disabled={disabled}
				name={field.name}
				id={field.name}
				checked={checked ?? field.state.value ?? false}
				onCheckedChange={(checked) => {
					field.handleChange(Boolean(checked));
					onCheckedChange?.(Boolean(checked));
				}}
				onBlur={field.handleBlur}
				aria-invalid={field.state.meta.errors.length > 0}
				aria-describedby={
					field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
				}
				aria-required={required}
				className="mt-1"
			/>
			<FieldContent>
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
			</FieldContent>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
