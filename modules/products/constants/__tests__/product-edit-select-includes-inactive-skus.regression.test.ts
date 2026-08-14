/**
 * @regression product-edit-select-includes-inactive-skus
 *
 * L'archivage désactive TOUS les SKUs d'un produit (`toggle-product-status`),
 * et `/modifier` chargeait le produit via GET_PRODUCT_SELECT, dont le filtre
 * `skus.where.isActive: true` rendait alors `skus: []` : le formulaire
 * amorçait `skuId: ""`, prix 0, `media: []`, et la soumission butait sur trois
 * rejets Zod — l'admin ne pouvait plus corriger ne serait-ce que le titre d'un
 * bijou archivé (même trou pour un DRAFT à variante unique inactive).
 *
 * Deux verrous :
 * 1. GET_PRODUCT_FOR_EDIT_SELECT ne contraint pas `isActive` (seul le soft
 *    delete est filtré) et garde l'ordre canonique `(position asc, id asc)`
 *    (skus[0] = variante principale).
 * 2. La page /modifier consomme bien `getProductForEdit` — forme APPEL sur une
 *    ligne non commentée, pas une simple mention (un scan de mot nu reste vert
 *    sur son propre commentaire).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

import { GET_PRODUCT_FOR_EDIT_SELECT, GET_PRODUCT_SELECT } from "../product.constants";

describe("GET_PRODUCT_FOR_EDIT_SELECT — les SKUs inactifs restent chargés", () => {
	it("ne contraint pas isActive (seul le soft delete est filtré)", () => {
		expect(GET_PRODUCT_FOR_EDIT_SELECT.skus.where).toEqual({ deletedAt: null });
	});

	it("garde l'ordre canonique position asc, id asc (skus[0] = variante principale, active ou non)", () => {
		expect(GET_PRODUCT_FOR_EDIT_SELECT.skus.orderBy).toEqual([{ position: "asc" }, { id: "asc" }]);
	});

	it("reste dérivé de GET_PRODUCT_SELECT (mêmes champs SKU sélectionnés)", () => {
		// Dérivation par spread : un champ ajouté au select public doit se
		// retrouver dans le select d'édition sans intervention manuelle.
		expect(GET_PRODUCT_FOR_EDIT_SELECT.skus.select).toBe(GET_PRODUCT_SELECT.skus.select);
	});
});

describe("la page /modifier consomme getProductForEdit", () => {
	it("appelle getProductForEdit (forme appel, hors commentaires)", () => {
		const source = readFileSync(
			join(process.cwd(), "app/admin/(protected)/catalogue/produits/[slug]/modifier/page.tsx"),
			"utf8",
		);
		const callLines = source
			.split("\n")
			.filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*"))
			.filter((line) => line.includes("getProductForEdit("));
		expect(callLines.length).toBeGreaterThan(0);
	});
});
