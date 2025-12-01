import { BarChart3, Clock, PackageX, TrendingUp } from "lucide-react"

// ============================================================================
// OVERVIEW SECTIONS CONFIGURATION
// ============================================================================

export type OverviewSectionId = "performance" | "operations" | "stock" | "trends"

export interface OverviewSectionConfig {
	id: OverviewSectionId
	title: string
	description: string
	icon: typeof TrendingUp
	defaultOpen: boolean
}

export const OVERVIEW_SECTIONS: readonly OverviewSectionConfig[] = [
	{
		id: "performance",
		title: "Performance",
		description: "CA, panier moyen, commandes",
		icon: TrendingUp,
		defaultOpen: true,
	},
	{
		id: "operations",
		title: "Opérations",
		description: "Commandes en cours, fulfillment",
		icon: Clock,
		defaultOpen: true,
	},
	{
		id: "stock",
		title: "Stock",
		description: "Ruptures et alertes",
		icon: PackageX,
		defaultOpen: true,
	},
	{
		id: "trends",
		title: "Tendances",
		description: "Graphiques revenus et top produits",
		icon: BarChart3,
		defaultOpen: true,
	},
] as const

// Valeurs par defaut pour la persistence localStorage
export const DEFAULT_OPEN_SECTIONS: OverviewSectionId[] = OVERVIEW_SECTIONS
	.filter((s) => s.defaultOpen)
	.map((s) => s.id)

// Cle localStorage pour la persistence
export const OVERVIEW_SECTIONS_STORAGE_KEY = "synclune-dashboard-open-sections"
