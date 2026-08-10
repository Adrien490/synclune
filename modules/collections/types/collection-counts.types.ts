import { type PublicationStatus } from "@/app/generated/prisma/client";

// ============================================================================
// FUNCTION TYPES
// ============================================================================

export type CollectionCountsByStatus = {
	[PublicationStatus.PUBLIC]: number;
	[PublicationStatus.DRAFT]: number;
	[PublicationStatus.ARCHIVED]: number;
};

export type GetCollectionCountsByStatusReturn = CollectionCountsByStatus;
