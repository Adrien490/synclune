interface OrderItem {
	productTitle: string | null;
	skuColor: string | null;
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
	userId: string | null;
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
	discountAmount: number;
	shippingCost: number;
	total: number;
	items: OrderItem[];
}
