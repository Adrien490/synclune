import {
	CheckCircle,
	Package,
	ShoppingCart,
	TrendingUp,
	Users,
	type LucideIcon,
} from "lucide-react"

export interface EmptyStateConfig {
	icon: LucideIcon
	title: string
	description: string
	variant?: "default" | "success"
}

/**
 * Configurations des états vides pour les composants du dashboard
 * Garantit des messages cohérents et localisés
 */
export const EMPTY_STATES = {
	// Generic
	noData: {
		icon: Package,
		title: "Aucune donnée",
		description: "Les données apparaîtront ici une fois disponibles.",
	},

	// Revenue & Sales
	noRevenue: {
		icon: TrendingUp,
		title: "Aucun revenu",
		description: "Les revenus apparaîtront une fois les premières ventes réalisées.",
	},
	noRevenueForPeriod: {
		icon: TrendingUp,
		title: "Aucun revenu sur cette période",
		description: "Aucune vente n'a été enregistrée sur la période sélectionnée.",
	},

	// Orders
	noOrders: {
		icon: ShoppingCart,
		title: "Aucune commande",
		description: "Les commandes apparaîtront ici.",
	},
	noOrdersForPeriod: {
		icon: ShoppingCart,
		title: "Aucune commande sur cette période",
		description: "Aucune commande n'a été passée sur la période sélectionnée.",
	},

	// Products
	noProducts: {
		icon: Package,
		title: "Aucun produit",
		description: "Les produits apparaîtront ici.",
	},
	noTopProducts: {
		icon: Package,
		title: "Aucune vente",
		description: "Les produits les plus vendus apparaîtront ici.",
	},

	// Stock
	noStockAlerts: {
		icon: CheckCircle,
		variant: "success" as const,
		title: "Stock OK",
		description: "Aucune alerte de stock à signaler.",
	},
	allSold: {
		icon: TrendingUp,
		variant: "success" as const,
		title: "Tous les produits ont été vendus !",
		description: "Aucun produit n'est resté invendu.",
	},

	// Customers
	noCustomers: {
		icon: Users,
		title: "Aucun client",
		description: "Les clients apparaîtront ici une fois inscrits.",
	},
	noCustomersForPeriod: {
		icon: Users,
		title: "Aucun nouveau client",
		description: "Aucun nouveau client sur la période sélectionnée.",
	},
} as const satisfies Record<string, EmptyStateConfig>

export type EmptyStateType = keyof typeof EMPTY_STATES
