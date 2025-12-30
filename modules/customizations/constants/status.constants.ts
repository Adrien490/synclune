import type { CustomizationRequestStatus } from "../types/customization.types";

// ============================================================================
// STATUS LABELS - Demandes de personnalisation
// ============================================================================

/**
 * Labels français pour les statuts de demande
 */
export const CUSTOMIZATION_STATUS_LABELS: Record<CustomizationRequestStatus, string> = {
	PENDING: "En attente",
	IN_PROGRESS: "En cours",
	COMPLETED: "Terminé",
	CANCELLED: "Annulé",
} as const;

/**
 * Couleurs et symboles pour les badges de statut (classes Tailwind)
 * Le symbole permet d'identifier le statut sans dépendre de la couleur seule (accessibilité)
 */
export const CUSTOMIZATION_STATUS_COLORS: Record<
	CustomizationRequestStatus,
	{ bg: string; text: string; dot: string; symbol: string }
> = {
	PENDING: {
		bg: "bg-amber-50",
		text: "text-amber-700",
		dot: "bg-amber-500",
		symbol: "⏳",
	},
	IN_PROGRESS: {
		bg: "bg-blue-50",
		text: "text-blue-700",
		dot: "bg-blue-500",
		symbol: "⚙",
	},
	COMPLETED: {
		bg: "bg-green-50",
		text: "text-green-700",
		dot: "bg-green-500",
		symbol: "✓",
	},
	CANCELLED: {
		bg: "bg-gray-50",
		text: "text-gray-700",
		dot: "bg-gray-500",
		symbol: "✗",
	},
} as const;

/**
 * Options pour le select de filtre par statut (admin)
 */
export const CUSTOMIZATION_STATUS_OPTIONS = Object.entries(CUSTOMIZATION_STATUS_LABELS).map(
	([value, label]) => ({
		value: value as CustomizationRequestStatus,
		label,
	})
);

/**
 * Statuts considérés comme "ouverts" (non finalisés)
 */
export const OPEN_STATUSES: CustomizationRequestStatus[] = [
	"PENDING",
	"IN_PROGRESS",
] as const;

/**
 * Statuts considérés comme "fermés" (finalisés)
 */
export const CLOSED_STATUSES: CustomizationRequestStatus[] = [
	"COMPLETED",
	"CANCELLED",
] as const;
