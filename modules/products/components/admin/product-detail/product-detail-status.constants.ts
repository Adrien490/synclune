import {
	productStatusLabel,
	productStatusVariant,
} from "@/modules/products/constants/product-status-display";
import type { BadgeVariant } from "@/shared/types/badge.types";

/**
 * Vue fusionnée `{label, variant}` dérivée de la SSOT
 * `product-status-display.ts` — schéma lean : statut booléen `active`.
 */
export function productStatusConfig(active: boolean): { label: string; variant: BadgeVariant } {
	return { label: productStatusLabel(active), variant: productStatusVariant(active) };
}
