import { describe, it, expect } from "vitest";
import { cartReducer } from "./cart-reducer.service";
import type { GetCartReturn } from "../types/cart.types";

function createCart(itemOverrides?: Partial<{ id: string; quantity: number }>[]): NonNullable<GetCartReturn> {
	const items = (itemOverrides ?? [{ id: "item-1", quantity: 2 }]).map((override) => ({
		id: override.id ?? "item-1",
		quantity: override.quantity ?? 1,
		priceAtAdd: 2500,
		createdAt: new Date(),
		updatedAt: new Date(),
		sku: {
			id: "sku-1",
			sku: "SKU-001",
			priceInclTax: 2500,
			compareAtPrice: null,
			inventory: 10,
			isActive: true,
			product: { id: "prod-1", title: "Bracelet", slug: "bracelet", status: "PUBLIC" },
			images: [],
			color: null,
			material: null,
			size: null,
		},
	}));

	return {
		id: "cart-1",
		userId: "user-1",
		sessionId: null,
		expiresAt: new Date(),
		createdAt: new Date(),
		updatedAt: new Date(),
		items,
	} as NonNullable<GetCartReturn>;
}

describe("cartReducer", () => {
	describe("null state", () => {
		it("should return null for any action", () => {
			expect(cartReducer(null, { type: "remove", itemId: "item-1" })).toBeNull();
			expect(cartReducer(null, { type: "updateQuantity", itemId: "item-1", quantity: 3 })).toBeNull();
		});
	});

	describe("remove action", () => {
		it("should remove the item with matching id", () => {
			const cart = createCart([{ id: "item-1" }, { id: "item-2" }]);
			const result = cartReducer(cart, { type: "remove", itemId: "item-1" });
			expect(result!.items).toHaveLength(1);
			expect(result!.items[0].id).toBe("item-2");
		});

		it("should return empty items when removing the last item", () => {
			const cart = createCart([{ id: "item-1" }]);
			const result = cartReducer(cart, { type: "remove", itemId: "item-1" });
			expect(result!.items).toHaveLength(0);
		});

		it("should not modify items when id does not match", () => {
			const cart = createCart([{ id: "item-1" }]);
			const result = cartReducer(cart, { type: "remove", itemId: "nonexistent" });
			expect(result!.items).toHaveLength(1);
		});

		it("should not mutate the original state", () => {
			const cart = createCart([{ id: "item-1" }, { id: "item-2" }]);
			const originalLength = cart.items.length;
			cartReducer(cart, { type: "remove", itemId: "item-1" });
			expect(cart.items).toHaveLength(originalLength);
		});
	});

	describe("updateQuantity action", () => {
		it("should update quantity of matching item", () => {
			const cart = createCart([{ id: "item-1", quantity: 1 }]);
			const result = cartReducer(cart, { type: "updateQuantity", itemId: "item-1", quantity: 5 });
			expect(result!.items[0].quantity).toBe(5);
		});

		it("should not change other items", () => {
			const cart = createCart([{ id: "item-1", quantity: 1 }, { id: "item-2", quantity: 3 }]);
			const result = cartReducer(cart, { type: "updateQuantity", itemId: "item-1", quantity: 5 });
			expect(result!.items[1].quantity).toBe(3);
		});

		it("should not modify items when id does not match", () => {
			const cart = createCart([{ id: "item-1", quantity: 2 }]);
			const result = cartReducer(cart, { type: "updateQuantity", itemId: "nonexistent", quantity: 5 });
			expect(result!.items[0].quantity).toBe(2);
		});

		it("should not mutate the original state", () => {
			const cart = createCart([{ id: "item-1", quantity: 1 }]);
			cartReducer(cart, { type: "updateQuantity", itemId: "item-1", quantity: 5 });
			expect(cart.items[0].quantity).toBe(1);
		});
	});
});
