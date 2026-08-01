import { ProductStatus } from "@/app/generated/prisma/enums";
import type { BadgeVariant } from "@/shared/types/badge.types";

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
	[ProductStatus.PUBLIC]: "Public",
	[ProductStatus.DRAFT]: "Brouillon",
	[ProductStatus.ARCHIVED]: "Archivé",
};

export const PRODUCT_STATUS_VARIANTS: Record<ProductStatus, BadgeVariant> = {
	[ProductStatus.PUBLIC]: "default",
	[ProductStatus.DRAFT]: "secondary",
	[ProductStatus.ARCHIVED]: "outline",
};
