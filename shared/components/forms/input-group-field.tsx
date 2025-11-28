"use client";

import { Field, FieldError } from "@/shared/components/ui/field";
import { InputGroup, InputGroupInput } from "@/shared/components/ui/input-group";
import { useFieldContext } from "@/shared/lib/form-context";

interface InputGroupFieldProps
	extends React.InputHTMLAttributes<HTMLInputElement> {
	children?: React.ReactNode; // Pour InputGroupAddon
}

export const InputGroupField = ({
	disabled,
	placeholder,
	type,
	min,
	max,
	step,
	children,
	...props
}: InputGroupFieldProps) => {
	const field = useFieldContext<string | number>();

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (type === "number") {
			const numValue = e.target.valueAsNumber;
			// Si la valeur est NaN (champ vide), on met 0 ou undefined selon le contexte
			field.handleChange(isNaN(numValue) ? 0 : numValue);
		} else {
			field.handleChange(e.target.value);
		}
	};

	// Bloque les caractères non-numériques pour type="number"
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (type === "number") {
			// Autoriser: chiffres, point, backspace, delete, tab, escape, enter, flèches
			const allowedKeys = [
				"Backspace",
				"Delete",
				"Tab",
				"Escape",
				"Enter",
				"ArrowLeft",
				"ArrowRight",
				"ArrowUp",
				"ArrowDown",
				"Home",
				"End",
			];
			if (allowedKeys.includes(e.key)) return;

			// Autoriser Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
			if (e.ctrlKey || e.metaKey) return;

			// Autoriser chiffres et point décimal
			if (!/^[0-9.]$/.test(e.key)) {
				e.preventDefault();
			}

			// Empêcher plusieurs points
			if (e.key === "." && e.currentTarget.value.includes(".")) {
				e.preventDefault();
			}
		}
	};

	// Pour les inputs number, on affiche une chaîne vide si la valeur est 0 ou NaN
	const displayValue =
		type === "number"
			? field.state.value === 0 || isNaN(field.state.value as number)
				? ""
				: field.state.value
			: field.state.value;

	return (
		<Field data-invalid={field.state.meta.errors.length > 0}>
			<InputGroup>
				<InputGroupInput
					id={field.name}
					min={min}
					max={max}
					step={step}
					type={type}
					disabled={disabled}
					name={field.name}
					placeholder={placeholder}
					value={displayValue}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onBlur={field.handleBlur}
					inputMode={type === "number" ? "decimal" : undefined}
					aria-invalid={field.state.meta.errors.length > 0}
					aria-describedby={
						field.state.meta.errors.length > 0
							? `${field.name}-error`
							: undefined
					}
					{...props}
				/>
				{children}
			</InputGroup>
			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
};
