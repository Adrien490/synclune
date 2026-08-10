import { describe, it, expect } from "vitest";
import {
	getCartItemSubtotal,
	isCartItemOutOfStock,
	isCartItemInactive,
	hasCartItemIssue,
	getCartItemIssueLabel,
	CART_ITEM_ISSUE_LABELS,
	getCartItemPrimaryImage,
} from "../cart-item.service";
import type { CartItem } from "../../types/cart.types";

function createCartItem(
	overrides: Partial<{
		priceAtAdd: number;
		quantity: number;
		inventory: number;
		isActive: boolean;
		status: string;
		compareAtPrice: number | null;
		images: { id: string }[];
	}>,
): CartItem {
	return {
		id: "item-1",
		quantity: overrides.quantity ?? 1,
		priceAtAdd: overrides.priceAtAdd ?? 2500,
		createdAt: new Date(),
		updatedAt: new Date(),
		sku: {
			id: "sku-1",
			sku: "SKU-001",
			priceInclTax: 2500,
			compareAtPrice: overrides.compareAtPrice ?? null,
			inventory: overrides.inventory ?? 10,
			isActive: overrides.isActive ?? true,
			product: {
				id: "prod-1",
				title: "Bracelet Lune",
				slug: "bracelet-lune",
				status: overrides.status ?? "PUBLIC",
			},
			images: (overrides.images ?? [
				{
					id: "img-1",
					url: "/img.jpg",
					blurDataUrl: null,
					thumbnailUrl: null,
					altText: "alt",
					mediaType: "IMAGE",
				},
			]) as CartItem["sku"]["images"],
			colors: [
				{
					colorId: "color-1",
					position: 0,
					color: { id: "color-1", name: "Or", hex: "#FFD700" },
				},
			],
			materials: [
				{
					materialId: "mat-1",
					position: 0,
					material: { id: "mat-1", name: "Acier" },
				},
			],
			size: null,
		},
	} as CartItem;
}

describe("getCartItemSubtotal", () => {
	it("should calculate price * quantity", () => {
		expect(getCartItemSubtotal(createCartItem({ priceAtAdd: 2500, quantity: 3 }))).toBe(7500);
	});

	it("should return 0 for quantity 0", () => {
		expect(getCartItemSubtotal(createCartItem({ priceAtAdd: 2500, quantity: 0 }))).toBe(0);
	});

	it("should return price for quantity 1", () => {
		expect(getCartItemSubtotal(createCartItem({ priceAtAdd: 1500, quantity: 1 }))).toBe(1500);
	});
});

describe("isCartItemOutOfStock", () => {
	it("should return true when inventory < quantity", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 2, quantity: 5 }))).toBe(true);
	});

	it("should return true when inventory is 0", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 0, quantity: 1 }))).toBe(true);
	});

	it("should return false when inventory >= quantity", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 5, quantity: 5 }))).toBe(false);
	});

	it("should return false when inventory > quantity", () => {
		expect(isCartItemOutOfStock(createCartItem({ inventory: 10, quantity: 3 }))).toBe(false);
	});
});

describe("isCartItemInactive", () => {
	it("should return true when SKU is not active", () => {
		expect(isCartItemInactive(createCartItem({ isActive: false }))).toBe(true);
	});

	it("should return true when product is not PUBLIC", () => {
		expect(isCartItemInactive(createCartItem({ status: "DRAFT" }))).toBe(true);
	});

	it("should return true when both inactive and not public", () => {
		expect(isCartItemInactive(createCartItem({ isActive: false, status: "ARCHIVED" }))).toBe(true);
	});

	it("should return false when active and public", () => {
		expect(isCartItemInactive(createCartItem({ isActive: true, status: "PUBLIC" }))).toBe(false);
	});
});

describe("hasCartItemIssue", () => {
	it("should return true for out of stock items", () => {
		expect(hasCartItemIssue(createCartItem({ inventory: 0, quantity: 1 }))).toBe(true);
	});

	it("should return true for inactive items", () => {
		expect(hasCartItemIssue(createCartItem({ isActive: false }))).toBe(true);
	});

	it("should return true for non-public products", () => {
		expect(hasCartItemIssue(createCartItem({ status: "DRAFT" }))).toBe(true);
	});

	it("should return false for available items", () => {
		expect(hasCartItemIssue(createCartItem({}))).toBe(false);
	});
});

describe("getCartItemIssueLabel", () => {
	/*
	 * Les libellés viennent de `CART_ITEM_ISSUE_LABELS`, pas de littéraux : c'est la SSOT
	 * partagée avec les pastilles de `cart-sheet-item-row.tsx`. Avant, cette fonction
	 * rendait « rupture » / « indisponible » en minuscules pour la liste de l'en-tête du
	 * panier tandis que les pastilles codaient « Rupture » / « Plus disponible » —
	 * trois mots pour deux états, sur la même surface. Asserter la constante plutôt que
	 * le texte fait échouer ce test si les deux surfaces re-divergent.
	 */
	it("rend le libellé « plus disponible » pour un SKU désactivé", () => {
		expect(getCartItemIssueLabel(createCartItem({ isActive: false }))).toBe(
			CART_ITEM_ISSUE_LABELS.inactive,
		);
	});

	it("rend le libellé « plus disponible » pour un produit non public", () => {
		expect(getCartItemIssueLabel(createCartItem({ status: "DRAFT" }))).toBe(
			CART_ITEM_ISSUE_LABELS.inactive,
		);
	});

	it("rend le libellé « rupture » quand le stock est nul", () => {
		expect(getCartItemIssueLabel(createCartItem({ inventory: 0, quantity: 1 }))).toBe(
			CART_ITEM_ISSUE_LABELS.outOfStock,
		);
	});

	it("rend le libellé « rupture » quand le stock est insuffisant", () => {
		expect(getCartItemIssueLabel(createCartItem({ inventory: 2, quantity: 5 }))).toBe(
			CART_ITEM_ISSUE_LABELS.outOfStock,
		);
	});

	it("priorise l'indisponibilité sur la rupture", () => {
		expect(getCartItemIssueLabel(createCartItem({ isActive: false, inventory: 0 }))).toBe(
			CART_ITEM_ISSUE_LABELS.inactive,
		);
	});

	it("les deux libellés sont distincts et non vides", () => {
		// Garde-fou de la SSOT elle-même : deux états qui partageraient un libellé
		// redeviendraient indiscernables pour le client.
		expect(CART_ITEM_ISSUE_LABELS.inactive).toBeTruthy();
		expect(CART_ITEM_ISSUE_LABELS.outOfStock).toBeTruthy();
		expect(CART_ITEM_ISSUE_LABELS.inactive).not.toBe(CART_ITEM_ISSUE_LABELS.outOfStock);
	});

	it("should return null for available items", () => {
		expect(getCartItemIssueLabel(createCartItem({}))).toBeNull();
	});
});

describe("getCartItemPrimaryImage", () => {
	it("should return the first image", () => {
		const image = {
			id: "img-1",
			url: "/img.jpg",
			blurDataUrl: null,
			thumbnailUrl: null,
			altText: "alt",
			mediaType: "IMAGE",
		};
		const item = createCartItem({ images: [image] as unknown as { id: string }[] });
		expect(getCartItemPrimaryImage(item)).toEqual(image);
	});

	it("should return null when no images", () => {
		const item = createCartItem({ images: [] });
		expect(getCartItemPrimaryImage(item)).toBeNull();
	});
});
