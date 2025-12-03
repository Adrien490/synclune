"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { InputGroup, InputGroupTextarea } from "@/shared/components/ui/input-group";
import { useFieldContext } from "@/shared/lib/form-context";

interface TextareaGroupFieldProps extends React.ComponentProps<"textarea"> {
	children?: React.ReactNode; // Pour InputGroupAddon
	required?: boolean;
}

export const TextareaGroupField = ({
	disabled,
	rows,
	placeholder,
	required,
	children,
	...props
}: TextareaGroupFieldProps) => {
	const field = useFieldContext<string>();

	return (
		<Field data-invalid={field.state.meta.errors.length > 0}>
			<InputGroup>
				<InputGroupTextarea
					id={field.name}
					disabled={disabled}
					name={field.name}
					placeholder={placeholder}
					value={field.state.value || ""}
					onChange={(e) => field.handleChange(e.target.value)}
					onBlur={field.handleBlur}
					rows={rows}
					aria-invalid={field.state.meta.errors.length > 0}
					aria-describedby={
						field.state.meta.errors.length > 0
							? `${field.name}-error`
							: undefined
					}
					aria-required={required}
					{...props}
				/>
				{children}
			</InputGroup>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
