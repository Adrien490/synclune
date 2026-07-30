import { describe, it, expect, vi } from "vitest";

/**
 * @regression STOCK-STALE-BASELINE-001
 *
 * Audit « SKUs et variantes » (2026-07-30), P1-4.
 *
 * Contrat : **un mutateur de stock doit invalider tout tag posé par les lecteurs de
 * stock.** `getInventoryInvalidationTags` omettait `SKU_DETAIL_BY_ID` et
 * `SKUS_LIST` — précisément les deux tags que `cacheSkuDetailById` pose sur
 * `fetchSkuById` / `fetchSkuDetailById` (profil `user` : 60 s revalidate /
 * 120 s stale).
 *
 * Pourquoi ce n'est pas cosmétique : le formulaire d'édition SKU rend l'inventaire
 * lu par `getSkuById`, et le poste comme `originalInventory` — la baseline du delta
 * relatif appliqué sous `FOR UPDATE`. Une baseline périmée fait diverger le stock
 * enregistré du stock saisi : réel 15, formulaire encore à 10, l'admin saisit 12 ⇒
 * delta +2 ⇒ 17. Silencieusement. La correction de concurrence optimiste
 * (STOCK-PHANTOM-001) dépend donc de la fraîcheur garantie ici.
 *
 * Le test compare les tags RÉELLEMENT posés par les helpers `cache*` (captés via un
 * mock de `next/cache`) à ceux produits par les helpers d'invalidation — plutôt que
 * de figer une liste en dur, qui se serait contentée de dupliquer le bug.
 */

const { mockCacheTag, mockCacheLife } = vi.hoisted(() => ({
	mockCacheTag: vi.fn(),
	mockCacheLife: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheTag: mockCacheTag,
	cacheLife: mockCacheLife,
	updateTag: vi.fn(),
}));

import {
	cacheProductSkus,
	cacheSkuDetailById,
	getInventoryInvalidationTags,
	getSkuInvalidationTags,
} from "../cache.utils";

const SKU_ID = "sku-abc";
const SKU_CODE = "SKU-ABC";
const PRODUCT_ID = "prod-abc";
const PRODUCT_SLUG = "bague-lune";

/** Tags que le LECTEUR pose réellement, capturés depuis l'appel à `cacheTag`. */
function tagsPostedBy(configure: () => void): string[] {
	mockCacheTag.mockClear();
	configure();
	return mockCacheTag.mock.calls.flat() as string[];
}

describe("STOCK-STALE-BASELINE-001 — l'invalidation couvre les tags des lecteurs", () => {
	const readerTags = {
		skuDetailById: () => tagsPostedBy(() => cacheSkuDetailById(SKU_ID)),
		productSkus: () => tagsPostedBy(() => cacheProductSkus(PRODUCT_ID)),
	};

	it("getInventoryInvalidationTags couvre tous les tags de cacheSkuDetailById", () => {
		const invalidated = getInventoryInvalidationTags(PRODUCT_SLUG, PRODUCT_ID, [SKU_ID]);

		for (const tag of readerTags.skuDetailById()) {
			expect(invalidated).toContain(tag);
		}
	});

	it("getInventoryInvalidationTags couvre tous les tags de cacheProductSkus", () => {
		const invalidated = getInventoryInvalidationTags(PRODUCT_SLUG, PRODUCT_ID, [SKU_ID]);

		for (const tag of readerTags.productSkus()) {
			expect(invalidated).toContain(tag);
		}
	});

	it("getSkuInvalidationTags couvre aussi ces deux lecteurs", () => {
		const invalidated = getSkuInvalidationTags(SKU_CODE, PRODUCT_ID, PRODUCT_SLUG, SKU_ID);

		for (const tag of [...readerTags.skuDetailById(), ...readerTags.productSkus()]) {
			expect(invalidated).toContain(tag);
		}
	});

	// Contre-épreuve : sans `skuIds`, les tags par-SKU ne peuvent pas être produits —
	// on vérifie que le helper de capture ne rend pas un tableau vide, sinon les
	// assertions ci-dessus passeraient sur zéro tag inspecté (le mode d'échec
	// classique de ce genre de garde-fou).
	it("les lecteurs posent bien des tags non vides", () => {
		expect(readerTags.skuDetailById().length).toBeGreaterThan(0);
		expect(readerTags.productSkus().length).toBeGreaterThan(0);
	});

	it("le tag par-SKU n'est produit que si un skuId est fourni", () => {
		const withoutSkuIds = getInventoryInvalidationTags(PRODUCT_SLUG, PRODUCT_ID);

		expect(withoutSkuIds).not.toContain(`sku-id-${SKU_ID}`);
		expect(withoutSkuIds).not.toContain(`sku-stock-${SKU_ID}`);
		// …mais la liste globale, elle, est inconditionnelle.
		expect(withoutSkuIds).toContain("skus-list");
	});
});
