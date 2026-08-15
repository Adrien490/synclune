import type { BadgeVariant } from "@/shared/types/badge.types";

// Schéma lean (lot 2) : le statut produit est le booléen `active`.
export const PRODUCT_STATUS_LABELS: Record<string, string> = {
	true: "En vente",
	false: "Brouillon",
};

export const PRODUCT_STATUS_VARIANTS: Record<string, BadgeVariant> = {
	true: "default",
	false: "secondary",
};

export function productStatusLabel(active: boolean): string {
	return active ? "En vente" : "Brouillon";
}

export function productStatusVariant(active: boolean): BadgeVariant {
	return active ? "default" : "secondary";
}
