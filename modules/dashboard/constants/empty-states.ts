import { TrendingUp, type LucideIcon } from "lucide-react";

interface EmptyStateConfig {
	icon: LucideIcon;
	title: string;
	description: string;
}

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
