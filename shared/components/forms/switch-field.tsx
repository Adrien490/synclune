import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { Switch } from "@/shared/components/ui/switch";
import { useFieldContext } from "@/shared/lib/form-context";
import { useRef, type ReactNode } from "react";

interface SwitchFieldProps {
	label?: ReactNode;
	/** Label accessible pour les lecteurs d'écran */
	"aria-label"?: string;
	/** Description affichée sous le switch */
	description?: string;
	disabled?: boolean;
	required?: boolean;
}

export const SwitchField = ({
	label,
	"aria-label": ariaLabel,
	description,
	disabled,
	required,
}: SwitchFieldProps) => {
	const field = useFieldContext<boolean>();
	const hiddenRef = useRef<HTMLInputElement>(null);

	return (
		<Field orientation="vertical" data-invalid={field.state.meta.errors.length > 0}>
			<div className="flex items-center gap-3">
				<Switch
					disabled={disabled}
					id={field.name}
					checked={field.state.value}
					onCheckedChange={(checked) => {
						const isChecked = Boolean(checked);
						field.handleChange(isChecked);
						if (hiddenRef.current) {
							hiddenRef.current.value = isChecked ? "true" : "false";
						}
					}}
					onBlur={field.handleBlur}
					aria-invalid={field.state.meta.errors.length > 0}
					aria-describedby={
						field.state.meta.errors.length > 0
							? `${field.name}-error`
							: description
								? `${field.name}-description`
								: undefined
					}
					aria-required={required}
					aria-label={ariaLabel}
				/>
				<input
					ref={hiddenRef}
					type="hidden"
					name={field.name}
					value={field.state.value ? "true" : "false"}
				/>

				{label && (
					<FieldLabel htmlFor={field.name} required={required}>
						{label}
					</FieldLabel>
				)}
			</div>
			{description && (
				<p id={`${field.name}-description`} className="text-muted-foreground ml-11 text-xs">
					{description}
				</p>
			)}
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
