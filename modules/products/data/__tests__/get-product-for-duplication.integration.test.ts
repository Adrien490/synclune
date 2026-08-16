/**
 * @regression get-product-for-duplication
 *
 * Vérifie que le select de duplication résout un produit réel contre le schéma
 * lean (FK couleur/matériau simples, médias sur le PRODUIT). L'ancêtre de ce
 * test avait attrapé un select resté sur l'ancien schéma pendant ~2,5 mois
 * (« Le produit source n'existe pas » à chaque duplication).
 *
 * Muet sans INTEGRATION_DATABASE_URL (cf. conventions de tests).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as RequireAdminModuleType from "@/modules/admin-auth/lib/require-admin";

type RequireAdminModule = typeof RequireAdminModuleType;

/**
 * ⚠️ `getProductForDuplication` est GARDÉ par `isAdmin()` (la garde vit dans la
 * couche data, pas seulement dans l'action appelante). En intégration il n'y a
 * ni requête ni cookie : `isAdmin()` est fail-closed, la fonction rendait donc
 * `null` et les deux tests échouaient sur « expected null not to be null »
 * (audit CI 2026-08-16) — en décrivant un défaut du SELECT qui n'existait pas.
 *
 * On simule la session admin, et RIEN d'autre : ce que cette suite verrouille,
 * c'est la forme du select contre le schéma réel. La garde elle-même est
 * couverte par les tests unitaires d'`admin-auth` et par le sweep e2e
 * `admin-security.spec.ts` (cookie forgé, expiré, signature transplantée).
 */
vi.mock("@/modules/admin-auth/lib/require-admin", async (importOriginal) => ({
	...(await importOriginal<RequireAdminModule>()),
	isAdmin: vi.fn(async () => true),
}));

/**
 * ⚠️ `fetchProductForDuplication` est un scope `"use cache"` : hors runtime
 * Next, `cacheLife()` lève « only available with the `cacheComponents` config ».
 * La directive elle-même n'est qu'une chaîne, inerte sous vitest — seuls les
 * deux appels d'annotation posent problème. On les neutralise, comme le font
 * déjà les tests unitaires de `cache.utils`. Ce que cette suite mesure est le
 * SQL émis, pas la politique de cache (couverte, elle, par
 * `modules/products/utils/__tests__/cache.utils.test.ts`).
 */
vi.mock("next/cache", () => ({
	cacheLife: () => undefined,
	cacheTag: () => undefined,
}));

import { getProductForDuplication } from "@/modules/products/data/get-product-for-duplication";
import { getIntegrationPrismaClient } from "@/test/integration/prisma-client";
import { createTestProduct } from "@/test/integration/factories";

const integrationEnabled = Boolean(process.env.INTEGRATION_DATABASE_URL);
const describeIntegration = integrationEnabled ? describe : describe.skip;

describeIntegration("getProductForDuplication — select lean contre le schéma réel", () => {
	let prisma: ReturnType<typeof getIntegrationPrismaClient>;
	let seq = 0;

	beforeEach(() => {
		prisma = getIntegrationPrismaClient();
		seq = 0;
	});

	async function createColor(hex: string) {
		const n = `${Date.now()}-${++seq}`;
		return prisma.color.create({
			data: { name: `Couleur ${n}`, hex },
		});
	}

	async function createMaterial() {
		const n = `${Date.now()}-${++seq}`;
		return prisma.material.create({
			data: { name: `Matériau ${n}` },
		});
	}

	it("résout un produit dont les variantes portent couleur et matériau (FK)", async () => {
		const product = await createTestProduct();
		const argent = await createColor("#C0C0C0");
		const laiton = await createMaterial();

		await prisma.productVariant.create({
			data: {
				productId: product.id,
				priceCents: 3_990,
				stock: 5,
				active: true,
				colorId: argent.id,
				materialId: laiton.id,
			},
		});
		await prisma.productMedia.create({
			data: {
				productId: product.id,
				url: "https://example.test/dup-a.jpg",
				type: "IMAGE",
				position: 0,
			},
		});

		const result = await getProductForDuplication(product.id);

		expect(result).not.toBeNull();
		expect(result!.variants).toHaveLength(1);

		const variant = result!.variants[0]!;
		expect(variant.colorId).toBe(argent.id);
		expect(variant.materialId).toBe(laiton.id);
		expect(result!.media).toHaveLength(1);
	});

	it("rend les médias triés par position, pas par ordre d'insertion", async () => {
		const product = await createTestProduct();

		// Inséré à l'envers : `position` doit primer sur l'ordre physique des lignes.
		await prisma.productMedia.create({
			data: {
				productId: product.id,
				url: "https://example.test/dup-b-second.jpg",
				type: "IMAGE",
				position: 1,
			},
		});
		await prisma.productMedia.create({
			data: {
				productId: product.id,
				url: "https://example.test/dup-b-first.jpg",
				type: "IMAGE",
				position: 0,
			},
		});

		const result = await getProductForDuplication(product.id);

		expect(result).not.toBeNull();
		expect(result!.media.map((m) => m.url)).toEqual([
			"https://example.test/dup-b-first.jpg",
			"https://example.test/dup-b-second.jpg",
		]);
	});
});
