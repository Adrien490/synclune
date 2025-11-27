/**
 * Types pour les paramètres de recherche de la page commandes client
 */

export type CustomerOrdersSearchParams = {
	// Pagination
	cursor?: string;
	direction?: string;
	perPage?: string;

	// Tri
	sortBy?: string;

	// Filtres
	filter_status?: string; // OrderStatus
	filter_fulfillmentStatus?: string; // FulfillmentStatus
};
