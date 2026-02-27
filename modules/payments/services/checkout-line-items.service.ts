import type Stripe from "stripe";
import { getValidImageUrl } from "@/shared/lib/media-validation";
import { DEFAULT_CURRENCY } from "@/shared/constants/currency";

interface SkuDetail {
	sku: {
		id: string;
		priceInclTax: number;
		size?: string | null;
		material?: string | null;
		images?: Array<{ url: string }> | null;
		product: {
			id: string;
			title: string;
		};
	};
}

interface CartItem {
	skuId: string;
	quantity: number;
	priceAtAdd: number;
}

interface BuildLineItemsResult {
	lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
	subtotal: number;
}

/**
 * Builds Stripe line items from validated cart items and SKU details.
 *
 * Also computes the subtotal (in cents) for discount calculations.
 */
export function buildStripeLineItems(
	cartItems: CartItem[],
	skuDetailsResults: Array<{ success: boolean; data?: SkuDetail }>,
): BuildLineItemsResult {
	const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
	let subtotal = 0;

	for (const cartItem of cartItems) {
		const skuResult = skuDetailsResults.find((r) => r.success && r.data?.sku.id === cartItem.skuId);

		if (!skuResult?.success || !skuResult.data) continue;

		const sku = skuResult.data.sku;
		const product = sku.product;
		const unitAmount = sku.priceInclTax;
		subtotal += unitAmount * cartItem.quantity;

		let productName = product.title;
		if (sku.size) productName += ` - Taille: ${sku.size}`;
		if (sku.material) productName += ` - ${sku.material}`;

		const imageUrl = getValidImageUrl(sku.images?.[0]?.url);

		lineItems.push({
			price_data: {
				currency: DEFAULT_CURRENCY,
				product_data: {
					name: productName,
					images: imageUrl ? [imageUrl] : undefined,
					metadata: {
						skuId: sku.id,
						productId: product.id,
					},
				},
				unit_amount: unitAmount,
			},
			quantity: cartItem.quantity,
		});
	}

	return { lineItems, subtotal };
}
