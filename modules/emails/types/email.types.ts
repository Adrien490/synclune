export type EmailResult =
	{ success: true; data: { id: string } } | { success: false; error: unknown };

export type ShippingAddress = {
	firstName: string;
	lastName: string;
	address1: string;
	address2?: string | null;
	postalCode: string;
	city: string;
	country: string;
	phone?: string;
};

export type OrderItem = {
	productTitle: string;
	skuColor: string | null;
	/**
	 * CSV des hex codes (ordre = position) pour pastille email (« #B76E79,#C0C0C0 »).
	 * Optionnel pour rétro-compat avec les commandes antérieures à la migration
	 * `add_sku_color_hexes_snapshot` (la pastille est juste skipée si absent).
	 */
	skuMaterial: string | null;
	skuSize: string | null;
	quantity: number;
	price: number;
};
