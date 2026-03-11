"use client";

import { getPostHogInstance } from "@/shared/lib/posthog";

/**
 * PostHog e-commerce event helpers
 * Tracks key conversion funnel events for analytics
 */
export const posthogEvents = {
	productViewed(product: { id: string; name: string; price: number; collection?: string }) {
		getPostHogInstance()?.capture("product_viewed", {
			product_id: product.id,
			product_name: product.name,
			price: product.price,
			collection: product.collection,
		});
	},

	addedToCart(product: { id: string; name: string; price: number; quantity: number }) {
		getPostHogInstance()?.capture("added_to_cart", {
			product_id: product.id,
			product_name: product.name,
			price: product.price,
			quantity: product.quantity,
		});
	},

	removedFromCart(product: { id: string; name: string }) {
		getPostHogInstance()?.capture("removed_from_cart", {
			product_id: product.id,
			product_name: product.name,
		});
	},

	checkoutStarted(cart: { total: number; itemCount: number }) {
		getPostHogInstance()?.capture("checkout_started", {
			total: cart.total,
			item_count: cart.itemCount,
		});
	},

	purchaseCompleted(order: { id: string; total: number; itemCount: number }) {
		getPostHogInstance()?.capture("purchase_completed", {
			order_id: order.id,
			revenue: order.total,
			item_count: order.itemCount,
		});
	},

	searchPerformed(query: string, resultCount: number) {
		getPostHogInstance()?.capture("search_performed", {
			query,
			result_count: resultCount,
		});
	},

	newsletterSubscribed() {
		getPostHogInstance()?.capture("newsletter_subscribed");
	},

	wishlistToggled(product: { id: string; name: string }, added: boolean) {
		getPostHogInstance()?.capture(added ? "added_to_wishlist" : "removed_from_wishlist", {
			product_id: product.id,
			product_name: product.name,
		});
	},
};
