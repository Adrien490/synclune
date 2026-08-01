/**
 * @regression sku-mutators-filter-deleted
 *
 * Toute lecture-avant-mutation d'un produit ou d'un SKU doit filtrer
 * `deletedAt: null` (CLAUDE.md, § Statuts / soft delete). L'audit admin
 * catalogue 2026-08-01 a trouvé 9 lectures sans le filtre alors que 5 actions
 * sœurs le portaient avec un docblock : muter un SKU soft-deleted (produit
 * supprimé) recréait des variantes fantômes, `update-product-collections`
 * ressuscitait les ProductCollection que `delete-product` purge, et
 * `delete-product` re-supprimait en silence.
 *
 * Allowlist POSITIVE par site (doctrine hover-focus-parity) : chaque entrée
 * verrouille UN `where` précis — pas un scan repo-wide qui hurlerait sur les
 * lectures d'unicité (un code SKU soft-deleted occupe toujours l'index unique,
 * son existence DOIT être visible du contrôle de doublon).
 *
 * Prouvé en retirant `deletedAt: null` d'un site : l'assertion correspondante
 * passe au rouge.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const REPO_ROOT = join(import.meta.dirname, "..", "..", "..", "..");

/** [fichier, motif du where gardé] — le motif doit contenir le filtre. */
const GUARDED_READS: Array<[string, RegExp]> = [
	[
		"modules/skus/actions/update-sku.ts",
		/where:\s*\{\s*id:\s*validatedData\.skuId,\s*deletedAt:\s*null\s*\}/,
	],
	[
		"modules/skus/actions/update-sku-status.ts",
		/where:\s*\{\s*id:\s*validatedSkuId,\s*deletedAt:\s*null\s*\}/,
	],
	[
		"modules/skus/actions/delete-sku.ts",
		/where:\s*\{\s*id:\s*validatedSkuId,\s*deletedAt:\s*null\s*\}/,
	],
	[
		"modules/skus/actions/set-primary-sku-media.ts",
		/where:\s*\{\s*id:\s*mediaId,\s*sku:\s*\{\s*deletedAt:\s*null\s*\}\s*\}/,
	],
	[
		"modules/skus/actions/update-sku-media-alt-text.ts",
		/where:\s*\{\s*id:\s*mediaId,\s*sku:\s*\{\s*deletedAt:\s*null\s*\}\s*\}/,
	],
	[
		"modules/skus/actions/create-sku.ts",
		/where:\s*\{\s*id:\s*validatedData\.productId,\s*deletedAt:\s*null\s*\}/,
	],
	[
		"modules/products/actions/delete-product.ts",
		/where:\s*\{\s*id:\s*productId,\s*deletedAt:\s*null\s*\}/,
	],
	[
		"modules/products/actions/update-product-collections.ts",
		/where:\s*\{\s*id:\s*validation\.data\.productId,\s*deletedAt:\s*null\s*\}/,
	],
	[
		"modules/products/actions/update-product.ts",
		/id:\s*validatedData\.defaultSku\.skuId,\s*productId:\s*validatedData\.productId,\s*deletedAt:\s*null/,
	],
];

describe("SKU-SOFT-DELETE-GUARD-001 — lectures pré-mutation filtrées deletedAt", () => {
	it.each(GUARDED_READS)("%s garde son filtre deletedAt", (rel, pattern) => {
		const source = readFileSync(join(REPO_ROOT, rel), "utf8");
		expect(source).toMatch(pattern);
	});
});
