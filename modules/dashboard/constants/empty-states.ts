import { BarChart3, ShoppingBag, TrendingUp } from "lucide-react";

/**
 * Configurations des états vides pour les charts
 */
export const EMPTY_STATES = {
	noRevenue: {
		icon: TrendingUp,
		title: "Aucun revenu",
		description: "Aucune vente enregistrée sur cette période.",
	},
	noOrders: {
		icon: ShoppingBag,
		title: "Aucune commande",
		description: "Aucune commande reçue sur cette période.",
	},
	noData: {
		icon: BarChart3,
		title: "Aucune donnée",
		description: "Aucune donnée disponible pour cette période.",
	},
} as const;

export type EmptyStateType = keyof typeof EMPTY_STATES;
