/**
 * Integration test — `getProductForDuplication` contre une DB Postgres réelle.
 *
 * @regression duplicate-product-m2m-select
 *
 * Garde-fou : le `select` de cette fonction doit être valide au regard du schéma
 * réel. C'est le SEUL type de test qui attrape la classe de défaut corrigée ici.
 *
 * Historique : `fetchProductForDuplication` sélectionnait `colorId: true` et
 * `materialId: true` sur `ProductSku`. Les migrations `20260514163156_add_sku_materials_m2m`
 * et `20260515181712_add_sku_colors_m2m` avaient déplacé ces colonnes dans les tables
 * de jointure `ProductSkuColor` / `ProductSkuMaterial` — les scalaires n'existaient plus.
 * Prisma levait une `PrismaClientValidationError`, le `catch` de la fonction la
 * transformait en `return null`, et `duplicateProduct` répondait
 * `notFound("Le produit source")`. « Dupliquer un produit » était donc cassé à 100 %
 * pendant ~2,5 mois.
 *
 * Pourquoi rien ne l'a vu :
 * - `pnpm typecheck` passe (le `GetSelect` de Prisma 7 ne rejette pas ces clés ici) ;
 * - le test unitaire `get-product-for-duplication.test.ts` mocke Prisma **et** sa
 *   fixture contenait `colorId: "color-1"` : il décrivait la forme morte et la validait.
 *
 * Seam : seul `cache.utils` est mocké (les primitives `cacheLife`/`cacheTag` de
 * `next/cache` exigent un scope de cache Next absent sous vitest). La requête Prisma,
 * elle, est bien celle de la production et part vers la vraie base — c'est tout
 * l'intérêt. Ne PAS mocker `@/shared/lib/prisma` ici : ce serait retomber dans
 * l'angle mort qu'on vient de fermer.
 *
 * Pré-requis : `INTEGRATION_DATABASE_URL` (cf `test/integration/setup.ts`).
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/modules/products/utils/cache.utils", () => ({
	cacheProductDetail: vi.fn(),
}));

import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestProduct } from "@/test/integration/factories";
import { getProductForDuplication } from "../get-product-for-duplication";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("getProductForDuplication — select M2M contre le schéma réel", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;
	let seq = 0;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
		seq = 0;
	});

	async function createColor(hex: string) {
		const n = `${Date.now()}-${++seq}`;
		return prisma.color.create({
			data: { slug: `color-${n}`, name: `Couleur ${n}`, hex },
		});
	}

	async function createMaterial() {
		const n = `${Date.now()}-${++seq}`;
		return prisma.material.create({
			data: { slug: `material-${n}`, name: `Matériau ${n}` },
		});
	}

	it("résout un produit dont les SKUs portent des couleurs et matériaux M2M", async () => {
		const product = await createTestProduct();
		const [argent, orRose] = await Promise.all([createColor("#C0C0C0"), createColor("#B76E79")]);
		const laiton = await createMaterial();

		await prisma.productSku.create({
			data: {
				sku: `DUP-A-${Date.now()}`,
				productId: product.id,
				priceInclTax: 3_990,
				inventory: 5,
				isActive: true,
				position: 0,
				colors: {
					create: [
						{ colorId: argent!.id, position: 0 },
						{ colorId: orRose!.id, position: 1 },
					],
				},
				materials: { create: [{ materialId: laiton.id, position: 0 }] },
			},
		});

		const result = await getProductForDuplication(product.id);

		// Avant le correctif : `null` (Prisma levait, le catch avalait).
		expect(result).not.toBeNull();
		expect(result!.skus).toHaveLength(1);

		const sku = result!.skus[0]!;
		expect(sku.colors).toEqual([
			{ colorId: argent!.id, position: 0 },
			{ colorId: orRose!.id, position: 1 },
		]);
		expect(sku.materials).toEqual([{ materialId: laiton.id, position: 0 }]);
	});

	it("rend les couleurs triées par position, pas par ordre d'insertion", async () => {
		const product = await createTestProduct();
		const [premier, second] = await Promise.all([createColor("#111111"), createColor("#222222")]);

		await prisma.productSku.create({
			data: {
				sku: `DUP-B-${Date.now()}`,
				productId: product.id,
				priceInclTax: 2_500,
				inventory: 1,
				isActive: true,
				position: 0,
				// Inséré à l'envers : `position` doit primer sur l'ordre physique des lignes.
				colors: {
					create: [
						{ colorId: premier!.id, position: 1 },
						{ colorId: second!.id, position: 0 },
					],
				},
			},
		});

		const result = await getProductForDuplication(product.id);

		expect(result!.skus[0]!.colors.map((c) => c.colorId)).toEqual([second!.id, premier!.id]);
	});

	it("exclut les SKUs soft-deleted du produit source", async () => {
		const product = await createTestProduct();

		await prisma.productSku.create({
			data: {
				sku: `DUP-LIVE-${Date.now()}`,
				productId: product.id,
				priceInclTax: 1_000,
				inventory: 1,
				isActive: true,
				position: 0,
			},
		});
		await prisma.productSku.create({
			data: {
				sku: `DUP-DEAD-${Date.now()}`,
				productId: product.id,
				priceInclTax: 2_000,
				inventory: 1,
				isActive: true,
				position: 1,
				deletedAt: new Date(),
			},
		});

		const result = await getProductForDuplication(product.id);

		expect(result!.skus).toHaveLength(1);
		expect(result!.skus[0]!.priceInclTax).toBe(1_000);
	});

	it("rend null sur un produit soft-deleted", async () => {
		const product = await createTestProduct({ deletedAt: new Date() });

		await expect(getProductForDuplication(product.id)).resolves.toBeNull();
	});

	// Le pendant écriture du même défaut : `duplicateProduct` passait
	// `colorId`/`materialId` à `productSku.create`. Inatteignable tant que la lecture
	// échouait d'abord, mais qui aurait cassé aussitôt celle-ci réparée. On prouve ici
	// que la forme imbriquée retenue (identique à `create-product.ts`) est valide, et
	// que les lignes de jointure sont bien créées.
	it("la forme d'écriture imbriquée des M2M est acceptée et crée les lignes de jointure", async () => {
		const source = await createTestProduct();
		const color = await createColor("#333333");
		const material = await createMaterial();

		const copy = await createTestProduct({ status: "DRAFT" });
		const createdSku = await prisma.productSku.create({
			data: {
				sku: `DUP-COPY-${Date.now()}`,
				productId: copy.id,
				priceInclTax: 4_200,
				inventory: 3,
				isActive: true,
				position: 0,
				colors: { create: [{ colorId: color.id, position: 0 }] },
				materials: { create: [{ materialId: material.id, position: 0 }] },
			},
			select: {
				id: true,
				colors: { select: { colorId: true, position: true } },
				materials: { select: { materialId: true, position: true } },
			},
		});

		expect(createdSku.colors).toEqual([{ colorId: color.id, position: 0 }]);
		expect(createdSku.materials).toEqual([{ materialId: material.id, position: 0 }]);
		// Le produit source reste intact — la copie ne vole pas ses jointures.
		await expect(
			prisma.productSkuColor.count({ where: { sku: { productId: source.id } } }),
		).resolves.toBe(0);
	});
});
