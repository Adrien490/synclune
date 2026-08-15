/**
 * Compteurs de produits par statut — schéma lean : booléen `active`.
 */
export type ProductCountsByStatus = {
	active: number;
	draft: number;
};

export type GetProductCountsByStatusReturn = ProductCountsByStatus;
