import { Field, FieldError } from "@/shared/components/ui/field";
import { FieldLabel } from "./field-label";
import { Switch } from "@/shared/components/ui/switch";
import { useFieldContext } from "@/shared/lib/form-context";
import { useFieldErrorVisibility } from "./use-field-error-visibility";
import { useRef, type ReactNode } from "react";

interface SwitchFieldProps {
	label?: ReactNode;
	/** Label accessible pour les lecteurs d'écran */
	"aria-label"?: string;
	/** Texte d'aide affiché sous le champ, relié via aria-describedby */
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

	const { visible: hasError, announce } = useFieldErrorVisibility(field);
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

	return (
		<Field orientation="vertical" data-invalid={hasError}>
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
					aria-invalid={hasError}
					aria-describedby={describedBy}
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
			{/* Layout horizontal (label à côté) : la description se rend sous le bloc */}
			{description && (
				<p id={descId!} className="text-muted-foreground ml-11 text-xs">
					{description}
				</p>
			)}
			<FieldError
				live={announce}
				id={`${field.name}-error`}
				errors={hasError ? field.state.meta.errors : undefined}
			/>
		</Field>
	);
};
