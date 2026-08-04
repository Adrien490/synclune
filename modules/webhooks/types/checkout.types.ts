interface OrderItem {
	productTitle: string | null;
	skuColor: string | null;
	// Snapshot CSV des hex de couleur, rendu en pastilles dans l'email de
	// confirmation (`EmailColorSwatch`). Il manquait ici : le webhook Stripe étant
	// l'émetteur de ~100 % des commandes, les pastilles ne s'affichaient QUE sur un
	// « marquer comme payée » manuel ou un renvoi admin — les deux seuls autres
	// émetteurs, qui eux transmettaient la colonne (audit V2, Lot 5).
	skuColorHexes: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	quantity: number;
	price: number;
	skuId: string;
	sku: {
		id: string;
		inventory: number;
		sku: string;
		// CACHE-CATALOG-002 : nécessaire pour invalider la page produit (tag
		// `product-${slug}`) quand le stock change au paiement.
		product: {
			id: string;
			slug: string;
		};
	} | null;
}

export interface OrderWithItems {
	id: string;
	orderNumber: string;
	customerEmail: string | null;
	shippingFirstName: string | null;
	shippingLastName: string | null;
	shippingAddress1: string | null;
	shippingAddress2: string | null;
	shippingPostalCode: string | null;
	shippingCity: string | null;
	shippingCountry: string | null;
	shippingPhone: string | null;
	subtotal: number;
	shippingCost: number;
	total: number;
	items: OrderItem[];
}
