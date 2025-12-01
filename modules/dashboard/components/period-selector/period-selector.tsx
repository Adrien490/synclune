"use client"

import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select"
import { cn } from "@/shared/utils/cn"
import { CalendarIcon } from "lucide-react"
import { fr } from "date-fns/locale"
import { PERIOD_OPTIONS } from "../../constants/periods"
import type { DashboardPeriod } from "../../utils/period-resolver"
import { usePeriodSelector } from "./use-period-selector"
import { PeriodSelectorSheet } from "./period-selector-sheet"

interface PeriodSelectorProps {
	className?: string
}

/**
 * Selecteur de periode unifie pour le dashboard
 * - Mobile: Sheet avec toutes les options + calendrier integre
 * - Desktop: Select enrichi + bouton calendrier
 */
export function PeriodSelector({ className }: PeriodSelectorProps) {
	const state = usePeriodSelector()
	const {
		isPending,
		optimisticPeriod,
		customDateRange,
		isCalendarOpen,
		setIsCalendarOpen,
		handlePeriodChange,
		handleDateRangeSelect,
		getPeriodLabel,
	} = state

	return (
		<div
			data-pending={isPending ? "" : undefined}
			className={cn(
				"flex items-center gap-2",
				"data-[pending]:opacity-60 data-[pending]:pointer-events-none transition-opacity duration-200",
				className
			)}
		>
			{/* Mobile: Sheet avec toutes les options */}
			<div className="md:hidden">
				<PeriodSelectorSheet state={state} />
			</div>

			{/* Desktop: Select + Calendar */}
			<div className="hidden md:flex items-center gap-2">
				<Select
					value={optimisticPeriod}
					onValueChange={(value) => handlePeriodChange(value as DashboardPeriod)}
					disabled={isPending}
				>
					<SelectTrigger className="w-[200px] h-11" aria-label="Selectionner une periode">
						<SelectValue placeholder="Periode">{getPeriodLabel()}</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{PERIOD_OPTIONS.filter((p) => p.value !== "custom").map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Bouton calendrier pour dates custom */}
				<Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
					<PopoverTrigger asChild>
						<Button
							variant={optimisticPeriod === "custom" ? "default" : "outline"}
							size="icon"
							className="h-11 w-11"
							disabled={isPending}
							aria-label="Selectionner une periode personnalisee"
							aria-expanded={isCalendarOpen}
						>
							<CalendarIcon className="h-4 w-4" aria-hidden="true" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="end">
						<Calendar
							mode="range"
							selected={customDateRange}
							onSelect={handleDateRangeSelect}
							numberOfMonths={2}
							locale={fr}
							disabled={(date) => date > new Date()}
							defaultMonth={customDateRange?.from}
						/>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	)
}
