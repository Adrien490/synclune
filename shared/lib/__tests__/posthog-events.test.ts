import { beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MOCKS
// ============================================================================

const { mockCapture, mockGetPostHog } = vi.hoisted(() => {
	const mockCapture = vi.fn();
	const mockGetPostHog = vi.fn(() => ({ capture: mockCapture }));
	return { mockCapture, mockGetPostHog };
});

vi.mock("@/shared/lib/posthog", () => ({
	getPostHog: mockGetPostHog,
}));

// ============================================================================
// TESTS
// ============================================================================

import { posthogEvents } from "../posthog-events";

describe("posthogEvents", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetPostHog.mockReturnValue({ capture: mockCapture });
	});

	// --------------------------------------------------------------------------
	// productViewed
	// --------------------------------------------------------------------------

	describe("productViewed", () => {
		it("calls capture with event name product_viewed and correct properties", () => {
			posthogEvents.productViewed({
				id: "prod-1",
				name: "Bague dorée",
				price: 49.9,
				collection: "printemps",
			});

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("product_viewed", {
				product_id: "prod-1",
				product_name: "Bague dorée",
				price: 49.9,
				collection: "printemps",
			});
		});

		it("forwards undefined collection when omitted", () => {
			posthogEvents.productViewed({ id: "prod-2", name: "Collier", price: 29 });

			expect(mockCapture).toHaveBeenCalledWith("product_viewed", {
				product_id: "prod-2",
				product_name: "Collier",
				price: 29,
				collection: undefined,
			});
		});

		it("does not throw when PostHog is null", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() => posthogEvents.productViewed({ id: "p", name: "X", price: 0 })).not.toThrow();
			expect(mockCapture).not.toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// addedToCart
	// --------------------------------------------------------------------------

	describe("addedToCart", () => {
		it("calls capture with event name added_to_cart and correct properties", () => {
			posthogEvents.addedToCart({
				id: "prod-3",
				name: "Bracelet argent",
				price: 35,
				quantity: 2,
			});

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("added_to_cart", {
				product_id: "prod-3",
				product_name: "Bracelet argent",
				price: 35,
				quantity: 2,
			});
		});

		it("does not throw when PostHog is null", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() =>
				posthogEvents.addedToCart({ id: "p", name: "X", price: 0, quantity: 1 }),
			).not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// removedFromCart
	// --------------------------------------------------------------------------

	describe("removedFromCart", () => {
		it("calls capture with event name removed_from_cart and correct properties", () => {
			posthogEvents.removedFromCart({ id: "prod-4", name: "Pendentif" });

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("removed_from_cart", {
				product_id: "prod-4",
				product_name: "Pendentif",
			});
		});

		it("does not throw when PostHog is null", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() => posthogEvents.removedFromCart({ id: "p", name: "X" })).not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// checkoutStarted
	// --------------------------------------------------------------------------

	describe("checkoutStarted", () => {
		it("calls capture with event name checkout_started and correct properties", () => {
			posthogEvents.checkoutStarted({ total: 120.5, itemCount: 3 });

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("checkout_started", {
				total: 120.5,
				item_count: 3,
			});
		});

		it("does not throw when PostHog is null", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() => posthogEvents.checkoutStarted({ total: 0, itemCount: 0 })).not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// purchaseCompleted
	// --------------------------------------------------------------------------

	describe("purchaseCompleted", () => {
		it("calls capture with event name purchase_completed and correct properties", () => {
			posthogEvents.purchaseCompleted({ id: "order-99", total: 85, itemCount: 2 });

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("purchase_completed", {
				order_id: "order-99",
				revenue: 85,
				item_count: 2,
			});
		});

		it("does not throw when PostHog is null", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() =>
				posthogEvents.purchaseCompleted({ id: "o", total: 0, itemCount: 0 }),
			).not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// searchPerformed
	// --------------------------------------------------------------------------

	describe("searchPerformed", () => {
		it("calls capture with event name search_performed and correct properties", () => {
			posthogEvents.searchPerformed("bague or", 12);

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("search_performed", {
				query: "bague or",
				result_count: 12,
			});
		});

		it("forwards zero result count", () => {
			posthogEvents.searchPerformed("introuvable", 0);

			expect(mockCapture).toHaveBeenCalledWith("search_performed", {
				query: "introuvable",
				result_count: 0,
			});
		});

		it("does not throw when PostHog is null", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() => posthogEvents.searchPerformed("x", 0)).not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// newsletterSubscribed
	// --------------------------------------------------------------------------

	describe("newsletterSubscribed", () => {
		it("calls capture with event name newsletter_subscribed and no extra properties", () => {
			posthogEvents.newsletterSubscribed();

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("newsletter_subscribed");
		});

		it("does not throw when PostHog is null", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() => posthogEvents.newsletterSubscribed()).not.toThrow();
		});
	});

	// --------------------------------------------------------------------------
	// wishlistToggled
	// --------------------------------------------------------------------------

	describe("wishlistToggled", () => {
		it("calls capture with added_to_wishlist when added is true", () => {
			posthogEvents.wishlistToggled({ id: "prod-5", name: "Chevalière" }, true);

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("added_to_wishlist", {
				product_id: "prod-5",
				product_name: "Chevalière",
			});
		});

		it("calls capture with removed_from_wishlist when added is false", () => {
			posthogEvents.wishlistToggled({ id: "prod-6", name: "Boucles" }, false);

			expect(mockCapture).toHaveBeenCalledOnce();
			expect(mockCapture).toHaveBeenCalledWith("removed_from_wishlist", {
				product_id: "prod-6",
				product_name: "Boucles",
			});
		});

		it("does not throw when PostHog is null and added is true", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() => posthogEvents.wishlistToggled({ id: "p", name: "X" }, true)).not.toThrow();
		});

		it("does not throw when PostHog is null and added is false", () => {
			mockGetPostHog.mockReturnValue(null as never);
			expect(() => posthogEvents.wishlistToggled({ id: "p", name: "X" }, false)).not.toThrow();
		});
	});
});
