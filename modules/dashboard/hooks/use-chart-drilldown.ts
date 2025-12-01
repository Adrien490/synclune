"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"
import {
	CHART_DRILLDOWN,
	buildChartDrilldownUrl,
	type ChartDrilldownKey,
} from "../constants/chart-drilldown"

/**
 * Hook pour gerer le drill-down des graphiques
 * Permet de naviguer vers une page filtree en cliquant sur un segment
 *
 * @example
 * const { handleClick, ariaLabel, isClickable } = useChartDrilldown("ordersStatus")
 *
 * <Bar onClick={(_, index) => handleClick(chartData[index].status)} />
 */
export function useChartDrilldown(chartKey: ChartDrilldownKey) {
	const router = useRouter()
	const config = CHART_DRILLDOWN[chartKey]

	const handleClick = useCallback(
		(filterValue: string) => {
			const url = buildChartDrilldownUrl(chartKey, filterValue)
			router.push(url)
		},
		[chartKey, router]
	)

	return {
		/** Handler a appeler avec la valeur du filtre */
		handleClick,
		/** Label accessible pour le graphique */
		ariaLabel: config.ariaLabel,
		/** URL de base pour affichage optionnel */
		baseUrl: config.baseUrl,
		/** Le graphique est cliquable */
		isClickable: true,
	}
}

/**
 * Props a ajouter aux composants de graphique pour le drill-down
 */
export interface ChartDrilldownProps {
	/** Active le drill-down (defaut: true) */
	enableDrilldown?: boolean
}
