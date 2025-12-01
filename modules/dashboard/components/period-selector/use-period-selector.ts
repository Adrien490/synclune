"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useOptimistic, useState, useTransition } from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import {
	DEFAULT_PERIOD,
	FROM_DATE_URL_KEY,
	PERIOD_OPTIONS,
	PERIOD_URL_KEY,
	TO_DATE_URL_KEY,
} from "../../constants/periods"
import { TAB_URL_KEY } from "../../constants/tabs"
import type { DashboardPeriod } from "../../utils/period-resolver"

/**
 * Hook partage pour la gestion de la selection de periode
 */
export function usePeriodSelector() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [isPending, startTransition] = useTransition()
	const [isCalendarOpen, setIsCalendarOpen] = useState(false)
	const [isSheetOpen, setIsSheetOpen] = useState(false)

	// Recuperer les valeurs actuelles
	const currentPeriod =
		(searchParams.get(PERIOD_URL_KEY) as DashboardPeriod) || DEFAULT_PERIOD
	const currentTab = searchParams.get(TAB_URL_KEY) || "overview"
	const fromDateParam = searchParams.get(FROM_DATE_URL_KEY)
	const toDateParam = searchParams.get(TO_DATE_URL_KEY)

	// Etat optimiste pour la periode
	const [optimisticPeriod, setOptimisticPeriod] =
		useOptimistic<DashboardPeriod>(currentPeriod)

	// Construire le DateRange pour le calendrier
	const customDateRange: DateRange | undefined =
		currentPeriod === "custom" && fromDateParam && toDateParam
			? {
					from: new Date(fromDateParam),
					to: new Date(toDateParam),
				}
			: undefined

	// Mettre a jour l'URL
	const updateUrl = (
		period: DashboardPeriod,
		fromDate?: string,
		toDate?: string
	) => {
		startTransition(() => {
			setOptimisticPeriod(period)

			const params = new URLSearchParams()
			params.set(TAB_URL_KEY, currentTab)
			params.set(PERIOD_URL_KEY, period)

			if (period === "custom" && fromDate && toDate) {
				params.set(FROM_DATE_URL_KEY, fromDate)
				params.set(TO_DATE_URL_KEY, toDate)
			}

			router.push(`/admin?${params.toString()}`, { scroll: false })
		})
	}

	// Gerer le changement de periode
	const handlePeriodChange = (period: DashboardPeriod) => {
		if (period === "custom") {
			setIsCalendarOpen(true)
			return
		}
		updateUrl(period)
		setIsSheetOpen(false)
	}

	// Gerer la selection de dates custom
	const handleDateRangeSelect = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			updateUrl(
				"custom",
				range.from.toISOString().split("T")[0],
				range.to.toISOString().split("T")[0]
			)
			setIsCalendarOpen(false)
			setIsSheetOpen(false)
		}
	}

	// Formater l'affichage de la periode
	const getPeriodLabel = () => {
		if (optimisticPeriod === "custom" && customDateRange?.from && customDateRange?.to) {
			return `${format(customDateRange.from, "dd MMM", { locale: fr })} - ${format(customDateRange.to, "dd MMM yyyy", { locale: fr })}`
		}
		return PERIOD_OPTIONS.find((p) => p.value === optimisticPeriod)?.label || "30 derniers jours"
	}

	// Formater l'affichage court de la periode
	const getPeriodShortLabel = () => {
		if (optimisticPeriod === "custom" && customDateRange?.from && customDateRange?.to) {
			return `${format(customDateRange.from, "dd/MM", { locale: fr })} - ${format(customDateRange.to, "dd/MM", { locale: fr })}`
		}
		return PERIOD_OPTIONS.find((p) => p.value === optimisticPeriod)?.shortLabel || "30j"
	}

	return {
		// Etat
		isPending,
		optimisticPeriod,
		customDateRange,
		isCalendarOpen,
		setIsCalendarOpen,
		isSheetOpen,
		setIsSheetOpen,

		// Handlers
		handlePeriodChange,
		handleDateRangeSelect,

		// Labels
		getPeriodLabel,
		getPeriodShortLabel,
	}
}
