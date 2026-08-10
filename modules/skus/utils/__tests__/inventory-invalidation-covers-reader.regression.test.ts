import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * @regression STOCK-STALE-BASELINE-001
 *
 * Audit « SKUs et variantes » (2026-07-30), P1-4 — réécrit par l'audit « cache
 * catalogue » (2026-07-31).
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
 * delta +2 ⇒ 17. Silencieusement.
 *
 * ⚠️ CE QUE CE TEST NE FAISAIT PAS. Sa version d'origine capturait les tags de
 * `cacheProductSkus` — un helper qui n'avait **aucun appelant en production**. La
 * moitié du garde-fou vérifiait donc la couverture d'un lecteur INEXISTANT, et
 * passait au vert sur rien (audit cache catalogue 2026-07-31). Il inspecte
 * désormais `fetchProductSkus`, le vrai lecteur par-produit, en l'APPELANT — pas en
 * appelant un helper qu'on suppose branché.
 */

const { mockCacheTag, mockCacheLife, mockFindMany, mockFindFirst } = vi.hoisted(() => ({
	mockCacheTag: vi.fn(),
	mockCacheLife: vi.fn(),
	mockFindMany: vi.fn(),
	mockFindFirst: vi.fn(),
}));

vi.mock("next/cache", () => ({
	cacheTag: mockCacheTag,
	cacheLife: mockCacheLife,
	updateTag: vi.fn(),
}));

vi.mock("@/shared/lib/prisma", () => ({
	prisma: { productSku: { findMany: mockFindMany, findFirst: mockFindFirst } },
}));

import { fetchProductSkus } from "../../data/fetch-skus";
import {
	cacheSkuDetailById,
	getInventoryInvalidationTags,
	getSkuInvalidationTags,
} from "../cache.utils";
import type { GetProductSkusParams } from "../../types/skus.types";

const SKU_ID = "sku-abc";
const SKU_CODE = "SKU-ABC";
const PRODUCT_ID = "prod-abc";
const PRODUCT_SLUG = "bague-lune";

const LIST_PARAMS = {
	sortBy: "created-descending",
	perPage: 20,
	filters: { productId: PRODUCT_ID },
} as unknown as GetProductSkusParams;

beforeEach(() => {
	vi.clearAllMocks();
	mockFindMany.mockResolvedValue([]);
	mockFindFirst.mockResolvedValue(null);
});

/** Tags qu'un lecteur pose réellement, capturés depuis les appels à `cacheTag`. */
function postedTags(): string[] {
	return mockCacheTag.mock.calls.flat() as string[];
}

describe("STOCK-STALE-BASELINE-001 — l'invalidation couvre les tags des lecteurs", () => {
	it("getInventoryInvalidationTags couvre tous les tags de cacheSkuDetailById", () => {
		cacheSkuDetailById(SKU_ID);
		const readerTags = postedTags();
		const invalidated = getInventoryInvalidationTags(PRODUCT_SLUG, PRODUCT_ID, [SKU_ID]);

		expect(readerTags.length).toBeGreaterThan(0);
		for (const tag of readerTags) {
			expect(invalidated).toContain(tag);
		}
	});

	it("getInventoryInvalidationTags couvre tous les tags posés par fetchProductSkus", async () => {
		await fetchProductSkus(LIST_PARAMS);
		const readerTags = postedTags();
		const invalidated = getInventoryInvalidationTags(PRODUCT_SLUG, PRODUCT_ID, [SKU_ID]);

		expect(readerTags.length).toBeGreaterThan(0);
		for (const tag of readerTags) {
			expect(invalidated).toContain(tag);
		}
	});

	it("getSkuInvalidationTags couvre aussi ces deux lecteurs", async () => {
		cacheSkuDetailById(SKU_ID);
		await fetchProductSkus(LIST_PARAMS);
		const readerTags = postedTags();
		const invalidated = getSkuInvalidationTags(SKU_CODE, PRODUCT_ID, PRODUCT_SLUG, SKU_ID);

		expect(readerTags.length).toBeGreaterThan(0);
		for (const tag of readerTags) {
			expect(invalidated).toContain(tag);
		}
	});

	/**
	 * Le cœur de la correction de 2026-07-31 : `fetchProductSkus` doit poser
	 * `SKUS(productId)` quand la liste est filtrée sur un produit. Tant que personne
	 * ne le posait, les ~10 mutateurs qui l'invalidaient tapaient dans le vide, et
	 * les assertions de couverture ci-dessus étaient vraies par vacuité.
	 */
	it("fetchProductSkus pose bien SKUS(productId) sur une liste filtrée", async () => {
		await fetchProductSkus(LIST_PARAMS);

		expect(postedTags()).toContain(`product-${PRODUCT_ID}-skus`);
		expect(postedTags()).toContain("skus-list");
		expect(postedTags()).toContain("admin-inventory-list");
	});

	it("tague chaque produit quand le filtre porte sur plusieurs ids", async () => {
		await fetchProductSkus({
			...LIST_PARAMS,
			filters: { productId: ["prod-1", "prod-2"] },
		} as unknown as GetProductSkusParams);

		expect(postedTags()).toContain("product-prod-1-skus");
		expect(postedTags()).toContain("product-prod-2-skus");
	});

	// Contre-épreuve : sans filtre produit, le tag par-produit ne peut pas exister —
	// la liste globale ne s'appuie que sur les deux tags larges. Sans cette
	// assertion, la précédente pourrait passer sur un helper qui taguerait tout.
	it("ne pose AUCUN tag par-produit sur une liste non filtrée", async () => {
		await fetchProductSkus({
			sortBy: "created-descending",
			perPage: 20,
		} as unknown as GetProductSkusParams);

		expect(postedTags().filter((t) => t.endsWith("-skus"))).toHaveLength(0);
		expect(postedTags()).toContain("skus-list");
	});

	it("le tag par-SKU n'est produit que si un skuId est fourni", () => {
		const withoutSkuIds = getInventoryInvalidationTags(PRODUCT_SLUG, PRODUCT_ID);

		expect(withoutSkuIds).not.toContain(`sku-id-${SKU_ID}`);
		expect(withoutSkuIds).not.toContain(`sku-stock-${SKU_ID}`);
		// …mais la liste globale, elle, est inconditionnelle.
		expect(withoutSkuIds).toContain("skus-list");
	});
});
