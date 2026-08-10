import type { PublicationStatus } from "@/app/generated/prisma/enums";
import {
	PRODUCT_STATUS_LABELS,
	PRODUCT_STATUS_VARIANTS,
} from "@/modules/products/constants/product-status-display";
import type { BadgeVariant } from "@/shared/types/badge.types";

/**
 * Vue fusionnée `{label, variant}` dérivée de la SSOT
 * `product-status-display.ts` — ne redéclare aucun libellé.
 */
export const PRODUCT_STATUS_CONFIG: Record<
	PublicationStatus,
	{ label: string; variant: BadgeVariant }
> = {
	PUBLIC: { label: PRODUCT_STATUS_LABELS.PUBLIC, variant: PRODUCT_STATUS_VARIANTS.PUBLIC },
	DRAFT: { label: PRODUCT_STATUS_LABELS.DRAFT, variant: PRODUCT_STATUS_VARIANTS.DRAFT },
	ARCHIVED: {
		label: PRODUCT_STATUS_LABELS.ARCHIVED,
		variant: PRODUCT_STATUS_VARIANTS.ARCHIVED,
	},
};
