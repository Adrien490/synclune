import type { CollectionStatus } from "@/app/generated/prisma/enums";

/**
 * Type minimal pour la collection en edition
 */
export interface EditableCollection {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	status: CollectionStatus;
}
