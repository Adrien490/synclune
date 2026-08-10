/**
 * @regression catalogue-selects-schema-validity
 *
 * Verrouille la VALIDITÉ AU REGARD DU SCHÉMA de tous les `select` Prisma du catalogue,
 * sans base de données.
 *
 * ## Le défaut que ce test attrape
 *
 * `GET_PRODUCT_FOR_DUPLICATION_SELECT` (alors en ligne dans
 * `data/get-product-for-duplication.ts`) sélectionnait `colorId` et `materialId` comme
 * des scalaires de `ProductSku`. Les migrations `20260514163156_add_sku_materials_m2m`
 * et `20260515181712_add_sku_colors_m2m` les avaient déplacés dans les tables de
 * jointure : ces colonnes n'existaient plus. Prisma levait une
 * `PrismaClientValidationError`, le `catch` de la fonction la transformait en
 * `return null`, et `duplicateProduct` répondait `notFound("Le produit source")`.
 * « Dupliquer un produit » a donc été cassé à 100 % pendant ~2,5 mois.
 *
 * ## Pourquoi aucun garde-fou existant ne le voyait
 *
 * - `pnpm typecheck` **passe** : le `satisfies Prisma.ProductSelect` et le `GetSelect`
 *   de Prisma 7 ne rejettent pas ces clés dans ce contexte.
 * - Les tests unitaires mockent `@/shared/lib/prisma` : aucun `select` n'est jamais
 *   soumis au validateur. Pire, la fixture du test de duplication contenait
 *   `colorId: "color-1"` — elle décrivait la forme morte et la validait.
 * - Les tests d'intégration l'attraperaient, mais ils skippent sans
 *   `INTEGRATION_DATABASE_URL` (donc en local, systématiquement).
 *
 * ## Le mécanisme
 *
 * Prisma valide la requête **côté client, avant d'ouvrir la connexion**. On construit
 * donc un client sur un port fermé et on classe l'échec :
 * - `PrismaClientValidationError` → le select ne correspond pas au schéma ;
 * - toute autre erreur (connexion) → le select a passé la validation.
 *
 * Aucune base n'est nécessaire, le test tourne dans la suite unitaire rapide, et il
 * couvre le trou exact entre `tsc` (aveugle) et l'intégration (skippée en local).
 *
 * ⚠️ Ne PAS mocker `@/shared/lib/prisma` ni `@/app/generated/prisma/*` dans ce fichier :
 * le client réel EST le sujet du test.
 */
import { describe, it, expect } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/app/generated/prisma/client";

import {
	GET_PRODUCT_SELECT,
	GET_PRODUCT_FOR_EDIT_SELECT,
	GET_PRODUCTS_SELECT,
	GET_PRODUCT_FOR_DUPLICATION_SELECT,
	PRODUCT_CAROUSEL_SELECT,
	QUICK_SEARCH_SELECT,
} from "../product.constants";
import {
	GET_COLLECTION_SELECT,
	GET_COLLECTION_STOREFRONT_SELECT,
	GET_COLLECTIONS_SELECT,
} from "@/modules/collections/constants/collection.constants";
import {
	GET_PRODUCT_TYPES_MENU_SELECT,
	GET_PRODUCT_TYPES_SELECT,
	GET_PRODUCT_TYPE_SELECT,
} from "@/modules/product-types/constants/product-type.constants";
import {
	GET_PRODUCT_SKU_SELECT,
	GET_PRODUCT_SKUS_DEFAULT_SELECT,
} from "@/modules/skus/constants/sku.constants";
import { GET_COLORS_SELECT, GET_COLOR_SELECT } from "@/modules/colors/constants/color.constants";
import {
	GET_MATERIALS_SELECT,
	GET_MATERIAL_SELECT,
} from "@/modules/materials/constants/materials.constants";

// Port 1 fermé : on ne doit jamais atteindre de base depuis la suite unitaire.
const UNREACHABLE_URL = "postgresql://unused:unused@127.0.0.1:1/unreachable";

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: UNREACHABLE_URL }),
});

type Verdict = "schema-invalid" | "schema-valid";

async function verdictOf(run: () => Promise<unknown>): Promise<Verdict> {
	try {
		await run();
		// Injoignable en pratique (le port est fermé), mais si jamais : le select est valide.
		return "schema-valid";
	} catch (error) {
		return (error as Error).constructor.name.includes("Validation")
			? "schema-invalid"
			: "schema-valid";
	}
}

const productSelects: Array<[string, Prisma.ProductSelect]> = [
	["GET_PRODUCT_SELECT", GET_PRODUCT_SELECT],
	["GET_PRODUCT_FOR_EDIT_SELECT", GET_PRODUCT_FOR_EDIT_SELECT],
	["GET_PRODUCTS_SELECT", GET_PRODUCTS_SELECT],
	["GET_PRODUCT_FOR_DUPLICATION_SELECT", GET_PRODUCT_FOR_DUPLICATION_SELECT],
	["PRODUCT_CAROUSEL_SELECT", PRODUCT_CAROUSEL_SELECT],
	["QUICK_SEARCH_SELECT", QUICK_SEARCH_SELECT],
];

const collectionSelects: Array<[string, Prisma.CollectionSelect]> = [
	["GET_COLLECTION_SELECT", GET_COLLECTION_SELECT],
	["GET_COLLECTION_STOREFRONT_SELECT", GET_COLLECTION_STOREFRONT_SELECT],
	["GET_COLLECTIONS_SELECT", GET_COLLECTIONS_SELECT],
];

const productTypeSelects: Array<[string, Prisma.ProductTypeSelect]> = [
	["GET_PRODUCT_TYPES_SELECT", GET_PRODUCT_TYPES_SELECT],
	["GET_PRODUCT_TYPES_MENU_SELECT", GET_PRODUCT_TYPES_MENU_SELECT],
	["GET_PRODUCT_TYPE_SELECT", GET_PRODUCT_TYPE_SELECT],
];

// SKUs + référentiels : hors périmètre jusqu'à l'audit 2026-08-01 alors que les
// selects couleurs/matériaux référencent `_count.skuColors`/`_count.skuMaterials`
// — des noms de relation RENOMMÉS par la migration M2M, soit exactement la
// classe de défaut pour laquelle cet oracle existe.
const productSkuSelects: Array<[string, Prisma.ProductSkuSelect]> = [
	["GET_PRODUCT_SKU_SELECT", GET_PRODUCT_SKU_SELECT],
	["GET_PRODUCT_SKUS_DEFAULT_SELECT", GET_PRODUCT_SKUS_DEFAULT_SELECT],
];

const colorSelects: Array<[string, Prisma.ColorSelect]> = [
	["GET_COLORS_SELECT", GET_COLORS_SELECT],
	["GET_COLOR_SELECT", GET_COLOR_SELECT],
];

const materialSelects: Array<[string, Prisma.MaterialSelect]> = [
	["GET_MATERIALS_SELECT", GET_MATERIALS_SELECT],
	["GET_MATERIAL_SELECT", GET_MATERIAL_SELECT],
];

describe("selects catalogue — validité schéma (@regression catalogue-selects-schema-validity)", () => {
	it.each(productSelects)("%s est valide au regard du schéma Product", async (_name, select) => {
		await expect(
			verdictOf(() => prisma.product.findFirst({ where: { id: "probe" }, select })),
		).resolves.toBe("schema-valid");
	});

	it.each(collectionSelects)(
		"%s est valide au regard du schéma Collection",
		async (_name, select) => {
			await expect(
				verdictOf(() => prisma.collection.findFirst({ where: { slug: "probe" }, select })),
			).resolves.toBe("schema-valid");
		},
	);

	it.each(productTypeSelects)(
		"%s est valide au regard du schéma ProductType",
		async (_name, select) => {
			await expect(
				verdictOf(() => prisma.productType.findFirst({ where: { slug: "probe" }, select })),
			).resolves.toBe("schema-valid");
		},
	);

	it.each(productSkuSelects)(
		"%s est valide au regard du schéma ProductSku",
		async (_name, select) => {
			await expect(
				verdictOf(() => prisma.productSku.findFirst({ where: { id: "probe" }, select })),
			).resolves.toBe("schema-valid");
		},
	);

	it.each(colorSelects)("%s est valide au regard du schéma Color", async (_name, select) => {
		await expect(
			verdictOf(() => prisma.color.findFirst({ where: { slug: "probe" }, select })),
		).resolves.toBe("schema-valid");
	});

	it.each(materialSelects)("%s est valide au regard du schéma Material", async (_name, select) => {
		await expect(
			verdictOf(() => prisma.material.findFirst({ where: { slug: "probe" }, select })),
		).resolves.toBe("schema-valid");
	});

	// Le `create` imbriqué M2M de `duplicate-product.ts`, pendant écriture du même
	// défaut : l'action passait `colorId`/`materialId` à `productSku.create`.
	it("le create imbriqué des couleurs/matériaux M2M est valide (duplicate-product)", async () => {
		await expect(
			verdictOf(() =>
				prisma.productSku.create({
					data: {
						productId: "probe",
						sku: "PROBE",
						priceInclTax: 100,
						inventory: 1,
						isActive: true,
						position: 0,
						colors: { create: [{ colorId: "probe-color", position: 0 }] },
						materials: { create: [{ materialId: "probe-material", position: 0 }] },
					},
				}),
			),
		).resolves.toBe("schema-valid");
	});

	// Méta-assertion : garde-fou du garde-fou. Si Prisma cessait un jour de valider
	// côté client (ou si `verdictOf` classait mal), toutes les assertions ci-dessus
	// passeraient au vert sans rien vérifier. On prouve donc que l'oracle sait dire non,
	// en lui soumettant exactement le select mort de mai 2026.
	it("l'oracle détecte bien un select invalide (les scalaires colorId/materialId disparus)", async () => {
		await expect(
			verdictOf(() =>
				prisma.product.findFirst({
					where: { id: "probe" },
					select: {
						id: true,
						skus: {
							select: {
								sku: true,
								// Clés absentes de `ProductSku` depuis les migrations M2M de mai 2026 —
								// le défaut historique, reproduit ici volontairement.
								//
								// Noter l'absence de `@ts-expect-error` : elle a été essayée et `tsc`
								// l'a signalée comme *inutile* (TS2578). Autrement dit le compilateur
								// accepte ces clés sans broncher. C'est la démonstration directe de
								// pourquoi `pnpm typecheck` n'a jamais pu attraper ce défaut — et donc
								// de pourquoi ce fichier existe.
								colorId: true,
								materialId: true,
							},
						},
					},
				}),
			),
		).resolves.toBe("schema-invalid");
	});
});
