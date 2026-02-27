import { TrendingUp } from "lucide-react";

/**
 * Configurations des états vides pour les charts
 */
export const EMPTY_STATES = {
	noRevenue: {
		icon: TrendingUp,
		title: "Aucun revenu",
		description: "Aucune vente enregistrée sur cette période.",
	},
} as const;

export type EmptyStateType = keyof typeof EMPTY_STATES;
