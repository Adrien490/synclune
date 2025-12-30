import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	Field,
	FieldError,
	FieldLabel,
} from "@/shared/components/ui/field";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";
import { ReactNode } from "react";

interface CheckboxFieldProps extends React.ComponentProps<typeof Checkbox> {
	label?: ReactNode;
	/** Label accessible pour les lecteurs d'écran (utilisé quand le label visuel contient du HTML complexe) */
	"aria-label"?: string;
}

export const CheckboxField = ({
	disabled,
	label,
	required,
	checked,
	onCheckedChange,
	className,
	...props
}: CheckboxFieldProps) => {
	const field = useFieldContext<boolean>();

	return (
		<Field
			orientation="vertical"
			data-invalid={field.state.meta.errors.length > 0}
		>
			<div className="flex items-start gap-3">
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
					className={cn("mt-1", className)}
					{...props}
				/>
				{label && (
					<FieldLabel htmlFor={field.name}>
						{label}
						{required && (
							<span className="text-destructive ml-1" aria-hidden="true">
								*
							</span>
						)}
					</FieldLabel>
				)}
			</div>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} className="ml-7" />
		</Field>
	);
};
