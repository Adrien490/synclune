"use client";

import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Field, FieldError } from "@/shared/components/ui/field";
import { Input, inputVariants } from "@/shared/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useFieldContext } from "@/shared/lib/form-context";
import { cn } from "@/shared/utils/cn";
import { useRef } from "react";
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
	/** Texte d'aide affiché sous le champ, lié via aria-describedby */
	helpText?: string;
	/** Borne min ISO datetime-local (ex: "2026-01-15T09:00"). Relayée à l'input natif + désactive les jours antérieurs sur le Calendar. */
	min?: string;
	/** Borne max ISO datetime-local (ex: "2026-12-31T23:59"). Relayée à l'input natif + désactive les jours postérieurs sur le Calendar. */
	max?: string;
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
	helpText,
	min,
	max,
}: DateTimeFieldProps) {
	const field = useFieldContext<string>();
	const helpTextId = helpText ? `${field.name}-help` : undefined;
	const describedBy =
		[helpTextId, field.state.meta.errors.length > 0 ? `${field.name}-error` : null]
			.filter(Boolean)
			.join(" ") || undefined;

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
	const minDate = parseValue(min);
	const maxDate = parseValue(max);
	const lastTimeRef = useRef("00:00");
	const hasError = field.state.meta.errors.length > 0;

	const isOutOfRange = (date: Date) => {
		if (minDate) {
			const minDay = new Date(minDate);
			minDay.setHours(0, 0, 0, 0);
			if (date < minDay) return true;
		}
		if (maxDate) {
			const maxDay = new Date(maxDate);
			maxDay.setHours(23, 59, 59, 999);
			if (date > maxDay) return true;
		}
		return false;
	};

	const nativeMin = min ? (dateOnly ? min.slice(0, 10) : min.slice(0, 16)) : undefined;
	const nativeMax = max ? (dateOnly ? max.slice(0, 10) : max.slice(0, 16)) : undefined;

	// Extrait l'heure pour l'affichage (time input n'est rendu que quand selectedDate existe)
	const displayTime = selectedDate
		? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
		: "00:00";

	const handleDateSelect = (date: Date | undefined) => {
		if (!date) {
			// Mémorise l'heure avant de supprimer la date
			if (selectedDate) {
				lastTimeRef.current = `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`;
			}
			field.handleChange("");
			return;
		}

		// Préserve l'heure existante ou la dernière connue
		const timeToUse = selectedDate
			? `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`
			: lastTimeRef.current;
		const [hours, minutes] = timeToUse.split(":").map(Number);
		date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
		field.handleChange(formatValue(date));
	};

	const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const time = e.target.value;
		if (!time || !selectedDate) return;

		const [hours, minutes] = time.split(":").map(Number);
		const newDate = new Date(selectedDate);
		newDate.setHours(hours ?? 0, minutes ?? 0, 0, 0);
		field.handleChange(formatValue(newDate));
	};

	const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		if (!val) {
			field.handleChange("");
			return;
		}
		if (dateOnly) {
			field.handleChange(`${val}T${lastTimeRef.current}`);
		} else {
			field.handleChange(val);
		}
	};

	const handleClear = () => {
		field.handleChange("");
	};

	const nativeValue = field.state.value
		? dateOnly
			? field.state.value.slice(0, 10)
			: field.state.value
		: "";

	const displayValue = selectedDate
		? dateOnly
			? format(selectedDate, "d MMMM yyyy", { locale: fr })
			: format(selectedDate, "d MMMM yyyy 'à' HH:mm", { locale: fr })
		: "";

	// Le `htmlFor` cible l'input natif (mobile), invisible au-delà de `md` : le
	// trigger du popover desktop n'héritait donc d'AUCUN nom accessible. On expose
	// le label par `id` pour le lier aux deux contrôles (WCAG 4.1.2 / 3.3.2).
	const labelId = `${field.name}-label`;

	return (
		<Field data-invalid={hasError}>
			{label && (
				<FieldLabel id={labelId} htmlFor={field.name} required={required} optional={optional}>
					{label}
				</FieldLabel>
			)}

			{/* Mobile: native date/datetime-local picker */}
			<div className={cn("flex gap-2 md:hidden", className)}>
				<input
					type={dateOnly ? "date" : "datetime-local"}
					id={field.name}
					// Sans `label` visible, aucun nom accessible n'était exposé : on
					// retombe sur le placeholder. Avec un label, on ne met PAS d'aria-label
					// (il masquerait le texte visible pour les lecteurs d'écran).
					aria-label={label ? undefined : placeholder}
					value={nativeValue}
					onChange={handleNativeChange}
					onBlur={field.handleBlur}
					disabled={disabled}
					required={required}
					min={nativeMin}
					max={nativeMax}
					aria-invalid={hasError}
					aria-describedby={describedBy}
					aria-required={required}
					className={cn(inputVariants(), "w-full")}
				/>
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

			{/* Desktop: Calendar popover */}
			<div className={cn("hidden gap-2 md:flex", className)}>
				<Popover>
					<PopoverTrigger asChild>
						<Button
							type="button"
							variant="outline"
							disabled={disabled}
							aria-invalid={hasError}
							aria-describedby={describedBy}
							aria-required={required}
							aria-labelledby={label ? labelId : undefined}
							className={cn(
								"min-h-11 w-full justify-start text-left font-normal",
								!selectedDate && "text-muted-foreground",
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
							disabled={minDate || maxDate ? isOutOfRange : undefined}
							// eslint-disable-next-line jsx-a11y/no-autofocus -- Calendar in Popover: focus expected on explicit open
							autoFocus
						/>
						{!dateOnly && selectedDate && (
							<div className="border-t p-3">
								<label htmlFor={`${field.name}-time`} className="text-sm font-medium">
									Heure
								</label>
								<Input
									id={`${field.name}-time`}
									type="time"
									value={displayTime}
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
			<input type="hidden" name={field.name} value={field.state.value} />

			{helpText && (
				<p id={helpTextId} className="text-muted-foreground text-xs">
					{helpText}
				</p>
			)}

			<FieldError id={`${field.name}-error`} errors={field.state.meta.errors} />
		</Field>
	);
}
