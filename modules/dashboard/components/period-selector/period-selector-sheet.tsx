"use client"

import { Button } from "@/shared/components/ui/button"
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
		isSheetOpen,
		setIsSheetOpen,
		handlePeriodChange,
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
					aria-label="Ouvrir le sélecteur de période"
				>
					<CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
					<span className="truncate">{getPeriodShortLabel()}</span>
					<ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
				</Button>
			</DrawerTrigger>
			<DrawerContent
				bottomInset
				className="pb-[max(1rem,env(safe-area-inset-bottom))]"
			>
				<DrawerHeader className="text-left">
					<DrawerTitle>Période d'analyse</DrawerTitle>
					<DrawerDescription>
						Sélectionnez la période pour afficher les statistiques
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

				</DrawerContent>
		</Drawer>
	)
}
