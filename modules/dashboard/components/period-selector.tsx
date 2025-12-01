"use client";

import { Button } from "@/shared/components/ui/button";
import { Calendar } from "@/shared/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/shared/utils/cn";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { DateRange } from "react-day-picker";
import {
	DEFAULT_PERIOD,
	FROM_DATE_URL_KEY,
	PERIOD_OPTIONS,
	PERIOD_URL_KEY,
	QUICK_PERIOD_OPTIONS,
	TO_DATE_URL_KEY,
} from "../constants/periods";
import { TAB_URL_KEY } from "../constants/tabs";
import type { DashboardPeriod } from "../utils/period-resolver";

interface PeriodSelectorProps {
	className?: string;
	/** Afficher les boutons rapides */
	showQuickButtons?: boolean;
}

/**
 * Selecteur de periode pour le dashboard
 * Client Component avec gestion URL-first
 */
export function PeriodSelector({
	className,
	showQuickButtons = true,
}: PeriodSelectorProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [isCalendarOpen, setIsCalendarOpen] = useState(false);

	// Recuperer les valeurs actuelles
	const currentPeriod =
		(searchParams.get(PERIOD_URL_KEY) as DashboardPeriod) || DEFAULT_PERIOD;
	const currentTab = searchParams.get(TAB_URL_KEY) || "overview";
	const fromDateParam = searchParams.get(FROM_DATE_URL_KEY);
	const toDateParam = searchParams.get(TO_DATE_URL_KEY);

	// Etat optimiste pour la periode
	const [optimisticPeriod, setOptimisticPeriod] =
		useOptimistic<DashboardPeriod>(currentPeriod);

	// Construire le DateRange pour le calendrier
	const customDateRange: DateRange | undefined =
		currentPeriod === "custom" && fromDateParam && toDateParam
			? {
					from: new Date(fromDateParam),
					to: new Date(toDateParam),
				}
			: undefined;

	// Mettre a jour l'URL
	const updateUrl = (
		period: DashboardPeriod,
		fromDate?: string,
		toDate?: string
	) => {
		startTransition(() => {
			setOptimisticPeriod(period);

			const params = new URLSearchParams();
			params.set(TAB_URL_KEY, currentTab);
			params.set(PERIOD_URL_KEY, period);

			if (period === "custom" && fromDate && toDate) {
				params.set(FROM_DATE_URL_KEY, fromDate);
				params.set(TO_DATE_URL_KEY, toDate);
			}

			router.push(`/admin?${params.toString()}`, { scroll: false });
		});
	};

	// Gerer le changement de periode
	const handlePeriodChange = (period: DashboardPeriod) => {
		if (period === "custom") {
			setIsCalendarOpen(true);
			return;
		}
		updateUrl(period);
	};

	// Gerer la selection de dates custom
	const handleDateRangeSelect = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			updateUrl(
				"custom",
				range.from.toISOString().split("T")[0],
				range.to.toISOString().split("T")[0]
			);
			setIsCalendarOpen(false);
		}
	};

	// Formater l'affichage de la periode
	const getPeriodLabel = () => {
		if (optimisticPeriod === "custom" && customDateRange?.from && customDateRange?.to) {
			return `${format(customDateRange.from, "dd MMM", { locale: fr })} - ${format(customDateRange.to, "dd MMM yyyy", { locale: fr })}`;
		}
		return PERIOD_OPTIONS.find((p) => p.value === optimisticPeriod)?.label || "30 derniers jours";
	};

	return (
		<div
			data-pending={isPending ? "" : undefined}
			className={cn(
				"flex items-center gap-2",
				"data-[pending]:opacity-60 data-[pending]:pointer-events-none transition-opacity duration-200",
				className
			)}
		>
			{/* Boutons rapides mobile (2 premiers seulement) - touch target 44px */}
			{showQuickButtons && (
				<div className="flex md:hidden items-center gap-1">
					{QUICK_PERIOD_OPTIONS.slice(0, 2).map((option) => (
						<Button
							key={option.value}
							variant={optimisticPeriod === option.value ? "default" : "ghost"}
							size="sm"
							disabled={isPending}
							onClick={() => handlePeriodChange(option.value)}
							className="h-11 px-3 min-w-[44px]"
							aria-label={`Afficher les donnees des ${option.label}`}
							aria-pressed={optimisticPeriod === option.value}
						>
							{option.shortLabel}
						</Button>
					))}
				</div>
			)}

			{/* Boutons rapides desktop (tous) - touch target 44px */}
			{showQuickButtons && (
				<div className="hidden md:flex items-center gap-1">
					{QUICK_PERIOD_OPTIONS.map((option) => (
						<Button
							key={option.value}
							variant={optimisticPeriod === option.value ? "default" : "ghost"}
							size="sm"
							disabled={isPending}
							onClick={() => handlePeriodChange(option.value)}
							className="h-11 px-3"
							aria-label={`Afficher les donnees des ${option.label}`}
							aria-pressed={optimisticPeriod === option.value}
						>
							{option.shortLabel}
						</Button>
					))}
				</div>
			)}

			{/* Select pour toutes les periodes */}
			<Select
				value={optimisticPeriod}
				onValueChange={(value) => handlePeriodChange(value as DashboardPeriod)}
				disabled={isPending}
			>
				<SelectTrigger className="w-[180px] h-11" aria-label="Selectionner une periode">
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

			{/* Bouton calendrier pour dates custom - touch target 44px */}
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
	);
}
