"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

interface UseRefreshDashboardReturn {
	/** Rafraichir les donnees du dashboard */
	refresh: () => void
	/** Indique si un refresh est en cours */
	isRefreshing: boolean
	/** Date du dernier refresh */
	lastUpdated: Date | null
}

/**
 * Hook pour rafraichir les donnees du dashboard
 * Utilise router.refresh() pour revalider les donnees serveur
 */
export function useRefreshDashboard(): UseRefreshDashboardReturn {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()
	const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

	const refresh = useCallback(() => {
		startTransition(() => {
			router.refresh()
			setLastUpdated(new Date())
		})
	}, [router])

	return {
		refresh,
		isRefreshing: isPending,
		lastUpdated,
	}
}
