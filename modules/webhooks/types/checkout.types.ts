interface OrderItem {
	productTitle: string | null;
	skuColor: string | null;
	skuMaterial: string | null;
	skuSize: string | null;
	quantity: number;
	price: number;
	skuId: string;
	// ⚠️ Identifiants SEULEMENT. Cette structure est celle qui alimente l'e-mail
	// de confirmation, dont TOUS les champs d'affichage viennent des colonnes
	// snapshot ci-dessus (invariant #4). Y transporter une valeur VIVANTE du SKU
	// (son stock, son code, a fortiori son titre ou son prix) met la donnée
	// courante à portée d'un `item.sku.…` dans un template — c'est exactement le
	// risque pour lequel `OrderItem.productId` a été retiré du schéma.
	// `inventory` et le code `sku` y voyageaient sans aucun lecteur : le stock est
	// validé depuis le `SELECT … FOR UPDATE`, pas d'ici (audit 2026-08-07).
	sku: {
		id: string;
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
