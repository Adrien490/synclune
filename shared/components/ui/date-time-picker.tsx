"use client";

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/utils/cn";

interface DateTimePickerProps {
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	className?: string;
}

export function DateTimePicker({
	value,
	onChange,
	placeholder = "Sélectionner une date et heure",
	disabled = false,
	className,
}: DateTimePickerProps) {
	const [open, setOpen] = React.useState(false);
	const [date, setDate] = React.useState<Date | undefined>(
		value ? new Date(value) : undefined
	);
	const [time, setTime] = React.useState(
		value ? format(new Date(value), "HH:mm") : "00:00"
	);

	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (selectedDate) {
			const [hours, minutes] = time.split(":");
			selectedDate.setHours(Number.parseInt(hours), Number.parseInt(minutes));
			setDate(selectedDate);

			if (onChange) {
				// Format ISO pour datetime-local
				const isoString = format(selectedDate, "yyyy-MM-dd'T'HH:mm");
				onChange(isoString);
			}
		}
	};

	const handleTimeChange = (newTime: string) => {
		setTime(newTime);

		if (date) {
			const [hours, minutes] = newTime.split(":");
			const newDate = new Date(date);
			newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes));
			setDate(newDate);

			if (onChange) {
				const isoString = format(newDate, "yyyy-MM-dd'T'HH:mm");
				onChange(isoString);
			}
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"w-full justify-start text-left font-normal",
						!date && "text-muted-foreground",
						className
					)}
					disabled={disabled}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{date ? (
						format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr })
					) : (
						<span>{placeholder}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={handleDateSelect}
					initialFocus
					locale={fr}
				/>
				<div className="p-3 border-t">
					<Label htmlFor="time" className="text-sm font-medium mb-2 block">
						Heure
					</Label>
					<Input
						id="time"
						type="time"
						value={time}
						onChange={(e) => handleTimeChange(e.target.value)}
						className="w-full"
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}
