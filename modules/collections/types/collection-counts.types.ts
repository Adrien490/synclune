/**
 * Compteurs de collections par statut — schéma lean : booléen `active`.
 */
export type CollectionCountsByStatus = {
	published: number;
	draft: number;
};

export type GetCollectionCountsByStatusReturn = CollectionCountsByStatus;
