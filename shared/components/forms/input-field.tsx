import { Field, FieldError, FieldLabel } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";

interface HTMLInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	label?: string;
}

export const InputField = ({
	disabled,
	label,
	placeholder,
	required,
	type,
	min,
	step,
	value,
	className,
}: HTMLInputProps) => {
	const field = useFieldContext<string | number | null>();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (type === "number") {
			const numValue = e.target.valueAsNumber;
			// Si la valeur est NaN (champ vide), on retourne null pour les champs optionnels
			field.handleChange(isNaN(numValue) ? null : numValue);
		} else {
			field.handleChange(e.target.value);
		}
	};

	// Pour les inputs number, on affiche une chaîne vide si la valeur est null, 0 ou NaN
	// Pour les autres inputs, on garantit toujours une valeur (string vide minimum)
	const fieldValue = field.state.value;
	const displayValue =
		type === "number"
			? fieldValue === null ||
				fieldValue === 0 ||
				(typeof fieldValue === "number" && isNaN(fieldValue))
				? ""
				: fieldValue
			: fieldValue ?? "";

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
			<Input
				id={field.name}
				min={min}
				step={step}
				type={type}
				disabled={disabled}
				name={field.name}
				placeholder={placeholder}
				value={value ?? displayValue}
				onChange={handleChange}
				onBlur={field.handleBlur}
				aria-invalid={field.state.meta.errors.length > 0}
				aria-describedby={
					field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
				}
				aria-required={required}
				className={cn("border-input focus:ring-1 focus:ring-primary", className)}
			/>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
