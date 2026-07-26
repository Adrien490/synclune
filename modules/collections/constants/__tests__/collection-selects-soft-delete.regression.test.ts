import { describe, expect, it } from "vitest";

import {
	GET_COLLECTION_SELECT,
	GET_COLLECTION_STOREFRONT_SELECT,
	GET_COLLECTIONS_SELECT,
} from "../collection.constants";

/**
 * @regression catalog-selects-soft-delete
 *
 * Audit catalogue — les selects collection filtrent les produits associés sur
 * `status: PUBLIC` UNIQUEMENT via ProductCollection. Un produit soft-deleted
 * (`deletedAt` posé) reste référencé par la table de jointure : sans le filtre
 * explicite `deletedAt: null`, il redeviendrait visible (liste + `_count`) en
 * cas de désynchronisation status/deletedAt (parité avec le pattern
 * `notDeleted` du reste du site). Ce test statique verrouille la présence du
 * filtre dans les 3 selects (détail admin, storefront, liste) et dans les
 * `_count` correspondants.
 */
describe("collection selects — filtre soft-delete (@regression catalog-selects-soft-delete)", () => {
	const EXPECTED_PRODUCT_WHERE = {
		status: "PUBLIC",
		deletedAt: null,
	};

	it("GET_COLLECTION_SELECT filtre products sur { status: PUBLIC, deletedAt: null }", () => {
		expect(GET_COLLECTION_SELECT.products.where.product).toMatchObject(EXPECTED_PRODUCT_WHERE);
	});

	it("GET_COLLECTION_STOREFRONT_SELECT filtre products sur { status: PUBLIC, deletedAt: null }", () => {
		expect(GET_COLLECTION_STOREFRONT_SELECT.products.where.product).toMatchObject(
			EXPECTED_PRODUCT_WHERE,
		);
	});

	it("GET_COLLECTIONS_SELECT filtre products sur { status: PUBLIC, deletedAt: null }", () => {
		expect(GET_COLLECTIONS_SELECT.products.where.product).toMatchObject(EXPECTED_PRODUCT_WHERE);
	});

	it("GET_COLLECTION_SELECT._count exclut les produits soft-deleted", () => {
		expect(GET_COLLECTION_SELECT._count.select.products.where.product.deletedAt).toBeNull();
	});

	it("GET_COLLECTIONS_SELECT._count exclut les produits soft-deleted", () => {
		expect(GET_COLLECTIONS_SELECT._count.select.products.where.product.deletedAt).toBeNull();
	});
});
