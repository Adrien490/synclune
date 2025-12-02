"use client"

import { Button } from "@/shared/components/ui/button"
import { Calendar } from "@/shared/components/ui/calendar"
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer"
import { cn } from "@/shared/utils/cn"
import { CalendarDays, ChevronDown, Check } from "lucide-react"
import { fr } from "date-fns/locale"
import { PERIOD_OPTIONS } from "../../constants/periods"
import type { usePeriodSelector } from "./use-period-selector"

interface PeriodSelectorSheetProps {
	state: ReturnType<typeof usePeriodSelector>
	className?: string
}

/**
 * Drawer mobile pour la selection de periode
 * Interface unifiee avec liste de periodes + calendrier integre
 */
export function PeriodSelectorSheet({ state, className }: PeriodSelectorSheetProps) {
	const {
		isPending,
		optimisticPeriod,
		customDateRange,
		isSheetOpen,
		setIsSheetOpen,
		handlePeriodChange,
		handleDateRangeSelect,
		getPeriodShortLabel,
	} = state

	return (
		<Drawer open={isSheetOpen} onOpenChange={setIsSheetOpen}>
			<DrawerTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					disabled={isPending}
					className={cn(
						"h-11 px-3 gap-2 min-w-[100px] justify-between",
						isPending && "opacity-60",
						className
					)}
					aria-label="Ouvrir le selecteur de periode"
				>
					<CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
					<span className="truncate">{getPeriodShortLabel()}</span>
					<ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
				</Button>
			</DrawerTrigger>
			<DrawerContent
				bottomInset
				className={cn(
					"max-h-[85dvh] overflow-y-auto",
					// Safe area pour iPhone notch/home indicator
					"pb-[max(1rem,env(safe-area-inset-bottom))]"
				)}
			>
				<DrawerHeader className="text-left">
					<DrawerTitle>Periode d'analyse</DrawerTitle>
					<DrawerDescription>
						Selectionnez la periode pour afficher les statistiques
					</DrawerDescription>
				</DrawerHeader>

				{/* Liste des periodes - padding horizontal harmonise avec SheetHeader */}
				<div className="grid gap-2 px-4 pb-4">
					{PERIOD_OPTIONS.filter((p) => p.value !== "custom").map((option) => (
						<Button
							key={option.value}
							variant={optimisticPeriod === option.value ? "default" : "outline"}
							size="lg"
							disabled={isPending}
							onClick={() => handlePeriodChange(option.value)}
							className="h-12 justify-between text-left"
							aria-pressed={optimisticPeriod === option.value}
						>
							<span>{option.label}</span>
							{optimisticPeriod === option.value && (
								<Check className="h-4 w-4" aria-hidden="true" />
							)}
						</Button>
					))}
				</div>

				{/* Section calendrier personnalise */}
				<div className="border-t mx-4 pt-4">
					<p className="text-sm font-medium text-muted-foreground mb-3">
						Ou choisissez des dates personnalisees
					</p>
					{/* Container centre avec overflow pour petits ecrans */}
					<div className="flex justify-center overflow-x-auto -mx-4 px-4">
						<Calendar
							mode="range"
							selected={customDateRange}
							onSelect={handleDateRangeSelect}
							numberOfMonths={1}
							locale={fr}
							disabled={(date) => date > new Date()}
							defaultMonth={customDateRange?.from}
							className="rounded-md border shrink-0"
						/>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	)
}
