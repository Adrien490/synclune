import { Checkbox } from "@/shared/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { useFieldContext } from "@/shared/lib/form-context";
import { useFieldErrorVisibility } from "./use-field-error-visibility";
import { cn } from "@/shared/utils/cn";
import { useRef, type ReactNode } from "react";

interface CheckboxFieldProps extends React.ComponentProps<typeof Checkbox> {
	label?: ReactNode;
	/** Label accessible pour les lecteurs d'écran (utilisé quand le label visuel contient du HTML complexe) */
	"aria-label"?: string;
	/** Texte d'aide affiché sous le champ, relié via aria-describedby */
	description?: string;
}

export const CheckboxField = ({
	disabled,
	label,
	required,
	checked,
	onCheckedChange,
	className,
	"aria-label": ariaLabel,
	description,
	...props
}: CheckboxFieldProps) => {
	const field = useFieldContext<boolean>();
	const hiddenRef = useRef<HTMLInputElement>(null);

	const hasError = useFieldErrorVisibility(field);
	const descId = description ? `${field.name}-desc` : null;
	const errorId = hasError ? `${field.name}-error` : null;
	const describedBy = [descId, errorId].filter(Boolean).join(" ") || undefined;

	return (
		<Field orientation="vertical" data-invalid={hasError}>
			<div className="flex items-start gap-3">
				<Checkbox
					disabled={disabled}
					id={field.name}
					checked={checked ?? field.state.value}
					aria-label={ariaLabel}
					onCheckedChange={(checked) => {
						const isChecked = Boolean(checked);
						field.handleChange(isChecked);
						onCheckedChange?.(isChecked);
						if (hiddenRef.current) {
							hiddenRef.current.value = isChecked ? "true" : "false";
						}
					}}
					onBlur={field.handleBlur}
					aria-invalid={hasError}
					aria-describedby={describedBy}
					aria-required={required}
					className={cn("mt-1", className)}
					{...props}
				/>
				<input
					ref={hiddenRef}
					type="hidden"
					name={field.name}
					value={field.state.value ? "true" : "false"}
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
			{/* Layout horizontal (label à côté) : la description se rend sous le bloc */}
			{description && (
				<p id={descId!} className="text-muted-foreground ml-7 text-xs">
					{description}
				</p>
			)}
			<FieldError
				id={`${field.name}-error`}
				errors={hasError ? field.state.meta.errors : undefined}
				className="ml-7"
			/>
		</Field>
	);
};
