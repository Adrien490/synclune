"use client";

import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Field, FieldError } from "@/shared/components/ui/field";
import { Input } from "@/shared/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";
import { FieldLabel } from "./field-label";

interface DateTimeFieldProps {
	/** Label affiché au-dessus du champ */
	label?: string;
	/** Marque le champ comme requis */
	required?: boolean;
	/** Marque le champ comme optionnel avec "(Optionnel)" */
	optional?: boolean;
	/** Placeholder pour le champ */
	placeholder?: string;
	/** Désactive le champ */
	disabled?: boolean;
	/** Classes CSS additionnelles */
	className?: string;
	/** Affiche uniquement la date (sans l'heure) */
	dateOnly?: boolean;
}

/**
 * Champ de sélection de date et heure avec Calendar shadcn/ui.
 *
 * Stocke la valeur comme chaîne ISO datetime-local (YYYY-MM-DDTHH:mm)
 * pour compatibilité avec les formulaires HTML et les Server Actions.
 *
 * @example
 * ```tsx
 * <form.AppField name="startsAt">
 *   {(field) => (
 *     <field.DateTimeField
 *       label="Date de début"
 *       placeholder="Sélectionner une date"
 *       optional
 *     />
 *   )}
 * </form.AppField>
 * ```
 */
export function DateTimeField({
	label,
	required,
	optional,
	placeholder = "Sélectionner une date",
	disabled,
	className,
	dateOnly = false,
}: DateTimeFieldProps) {
	const field = useFieldContext<string>();

	// Parse la valeur ISO en Date
	const parseValue = (value: string | null | undefined): Date | undefined => {
		if (!value) return undefined;
		const date = new Date(value);
		return isNaN(date.getTime()) ? undefined : date;
	};

	// Formate une Date en chaîne datetime-local (YYYY-MM-DDTHH:mm)
	const formatValue = (date: Date | undefined): string => {
		if (!date) return "";
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	};

	const selectedDate = parseValue(field.state.value);

	// Extrait l'heure de la valeur actuelle
	const currentTime = selectedDate
		? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
		: "00:00";

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) {
			field.handleChange("");
			return;
		}

		// Préserve l'heure existante ou utilise 00:00
		const [hours, minutes] = currentTime.split(":").map(Number);
		date.setHours(hours, minutes, 0, 0);
		field.handleChange(formatValue(date));
	};

	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = e.target.value;
		if (!time || !selectedDate) return;

		const [hours, minutes] = time.split(":").map(Number);
		const newDate = new Date(selectedDate);
		newDate.setHours(hours, minutes, 0, 0);
		field.handleChange(formatValue(newDate));
	};

	const handleClear = () => {
		field.handleChange("");
	};

	const displayValue = selectedDate
		? dateOnly
			? format(selectedDate, "d MMMM yyyy", { locale: fr })
			: format(selectedDate, "d MMMM yyyy 'à' HH:mm", { locale: fr })
		: "";

	return (
		<Field data-invalid={field.state.meta.errors.length > 0}>
			{label && (
				<FieldLabel htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}

			<div className={cn("flex gap-2", className)}>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							disabled={disabled}
							className={cn(
								"min-h-11 w-full justify-start text-left font-normal",
								!selectedDate && "text-muted-foreground",
								field.state.meta.errors.length > 0 &&
									"border-destructive ring-destructive/20"
							)}
						>
							<CalendarIcon className="mr-2 size-4" />
							{displayValue || placeholder}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={selectedDate}
							onSelect={handleDateSelect}
							initialFocus
						/>
						{!dateOnly && selectedDate && (
							<div className="border-t p-3">
								<label className="text-sm font-medium">Heure</label>
								<Input
									type="time"
									value={currentTime}
									onChange={handleTimeChange}
									disabled={disabled}
									className="mt-1.5"
								/>
							</div>
						)}
					</PopoverContent>
				</Popover>

				{selectedDate && !disabled && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={handleClear}
						className="min-h-11 shrink-0"
						aria-label="Effacer la date"
					>
						<X className="size-4" />
					</Button>
				)}
			</div>

			{/* Hidden input for form submission */}
			<input type="hidden" name={field.name} value={field.state.value ?? ""} />

			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
}
