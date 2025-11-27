/**
 * Type definitions for OrderItem snapshots
 *
 * OrderItem now uses denormalized fields for better performance.
 * Individual fields are stored directly on OrderItem rather than in JSON blobs.
 */

/**
 * Helper function to create OrderItem data from SKU with denormalized fields
 *
 * Usage example:
 * ```typescript
 * const sku = await prisma.productSku.findUnique({
 *   where: { id: skuId },
 *   include: {
 *     product: { select: { id: true, title: true, description: true } },
 *     color: { select: { name: true } },
 *     images: { where: { isPrimary: true }, select: { url: true }, take: 1 },
 *   },
 * });
 *
 * const orderItemData = createOrderItemData(sku, quantity);
 * await prisma.orderItem.create({ data: orderItemData });
 * ```
 */
export function createOrderItemData(
	sku: {
		id: string;
		sku: string;
		priceInclTax: number;
		color?: { name: string } | null;
		material?: string | null;
		size?: string | null;
		product: {
			id: string;
			title: string;
			description?: string | null;
		};
		images?: Array<{ url: string }>;
	},
	orderId: string,
	quantity: number,
	metadata?: Record<string, unknown> | null
) {
	return {
		orderId,
		productId: sku.product.id,
		skuId: sku.id,
		// Product snapshots
		productTitle: sku.product.title,
		productDescription: sku.product.description || null,
		productImageUrl: sku.images?.[0]?.url || null,
		// SKU snapshots (denormalized)
		skuColor: sku.color?.name || null,
		skuMaterial: sku.material || null,
		skuSize: sku.size || null,
		skuImageUrl: sku.images?.[0]?.url || null,
		// Price and quantity
		price: sku.priceInclTax,
		quantity,
		// Optional fields
		metadata: metadata || null,
	};
}

/**
 * Structure for shippingAddress (reference only - now stored as individual fields)
 *
 * @deprecated The Order model now uses individual fields instead of JSON:
 * - shippingFirstName
 * - shippingLastName
 * - shippingAddress1
 * - shippingAddress2
 * - shippingPostalCode
 * - shippingCity
 * - shippingCountry
 * - shippingPhone
 *
 * This interface is kept for reference and compatibility with form data.
 * Using French address format with postal code validation.
 */
export interface OrderAddress {
	firstName: string;
	lastName: string;
	company?: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	postalCode: string; // 5-digit French postal code
	country: string; // Code ISO: "FR", "BE", "CH"
	phoneNumber?: string; // +33 X XX XX XX XX format
	instructions?: string; // Delivery instructions
}

/**
 * Metadata field structure (optional JSON field on OrderItem)
 * For non-critical information that doesn't need to be indexed
 */
export interface OrderItemMetadata {
	weight?: number; // in grams
	chainLength?: string; // e.g., "45cm"
	dimensions?: string; // e.g., "2cm x 3cm"
	packageType?: "standard" | "gift" | "premium";
	giftMessage?: string;
	engraving?: string;
	// Extensible for future needs
	[key: string]: unknown;
}
