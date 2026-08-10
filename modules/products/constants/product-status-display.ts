import { PublicationStatus } from "@/app/generated/prisma/enums";
import type { BadgeVariant } from "@/shared/types/badge.types";

export const PRODUCT_STATUS_LABELS: Record<PublicationStatus, string> = {
	[PublicationStatus.PUBLIC]: "Public",
	[PublicationStatus.DRAFT]: "Brouillon",
	[PublicationStatus.ARCHIVED]: "Archivé",
};

export const PRODUCT_STATUS_VARIANTS: Record<PublicationStatus, BadgeVariant> = {
	[PublicationStatus.PUBLIC]: "default",
	[PublicationStatus.DRAFT]: "secondary",
	[PublicationStatus.ARCHIVED]: "outline",
};
