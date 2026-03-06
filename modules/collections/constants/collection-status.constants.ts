import { CollectionStatus } from "@/app/generated/prisma/enums";
import type { BadgeVariant } from "@/shared/types/badge.types";

// ============================================================================
// STATUS LABELS, COLORS & VARIANTS
// Client-safe constants - enum-only Prisma import (no DB client)
// ============================================================================

export const COLLECTION_STATUS_LABELS = {
	DRAFT: "Brouillon",
	PUBLIC: "Publiée",
	ARCHIVED: "Archivée",
} as const;

export const COLLECTION_STATUS_COLORS = {
	DRAFT: "#f59e0b", // amber
	PUBLIC: "#22c55e", // green
	ARCHIVED: "#6b7280", // gray
} as const;

export const COLLECTION_STATUS_VARIANTS: Record<CollectionStatus, BadgeVariant> = {
	[CollectionStatus.DRAFT]: "warning",
	[CollectionStatus.PUBLIC]: "success",
	[CollectionStatus.ARCHIVED]: "secondary",
} as const;

export type { CollectionStatusKey } from "../types/collection-status.types";
