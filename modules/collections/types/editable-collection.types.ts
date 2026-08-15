/**
 * Type minimal pour la collection en edition — schéma lean : statut booléen.
 */
export interface EditableCollection {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	active: boolean;
}
