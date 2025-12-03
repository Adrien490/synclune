import { CollectionStatus } from "@/app/generated/prisma";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type CollectionCountsByStatus = {
	[CollectionStatus.PUBLIC]: number;
	[CollectionStatus.DRAFT]: number;
	[CollectionStatus.ARCHIVED]: number;
};

export type GetCollectionCountsByStatusReturn = CollectionCountsByStatus;
