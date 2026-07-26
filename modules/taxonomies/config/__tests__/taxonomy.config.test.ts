import { describe, it, expect } from "vitest";

import { TAXONOMY_CONFIG, getTaxonomyConfig, agree, formatUsage } from "../taxonomy.config";
import type { TaxonomyKind } from "../../types/taxonomy.types";

const KINDS: TaxonomyKind[] = ["color", "material", "product-type"];

describe("TAXONOMY_CONFIG", () => {
	it("expose les 3 taxonomies du catalogue", () => {
		expect(Object.keys(TAXONOMY_CONFIG).sort()).toEqual(["color", "material", "product-type"]);
	});

	it.each(KINDS)("%s : `kind` correspond à sa clé de registre", (kind) => {
		// Une clé désalignée ferait charger la config d'une autre entité.
		expect(TAXONOMY_CONFIG[kind].kind).toBe(kind);
	});

	it.each(KINDS)("%s : renseigne tous les champs dont dépendent les composants", (kind) => {
		const config = TAXONOMY_CONFIG[kind];

		expect(config.basePath).toMatch(/^\/admin\/catalogue\//);
		expect(config.formDialogId).toBeTruthy();
		expect(config.deleteDialogId).toBeTruthy();
		expect(config.drawerNamespace).toBeTruthy();
		expect(config.createButtonLabel).toBeTruthy();
		expect(config.createAriaLabel).toBeTruthy();
		expect(config.search.placeholder).toBeTruthy();
		expect(config.search.ariaLabel).toBeTruthy();
		expect(Object.keys(config.sortLabels).length).toBeGreaterThan(0);
		expect(config.defaultSort).toBeTruthy();
	});

	it.each(KINDS)("%s : le tri par défaut fait partie des options de tri", (kind) => {
		const config = TAXONOMY_CONFIG[kind];
		// Un défaut absent des libellés afficherait un badge de tri vide.
		expect(Object.keys(config.sortLabels)).toContain(config.defaultSort);
	});

	it("les identifiants de dialogue sont uniques entre taxonomies", () => {
		// Deux entités partageant un `formDialogId` ouvriraient le même dialogue :
		// cliquer « Créer » sur les matériaux afficherait le formulaire couleur.
		const ids = KINDS.flatMap((kind) => [
			TAXONOMY_CONFIG[kind].formDialogId,
			TAXONOMY_CONFIG[kind].deleteDialogId,
		]);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("les chemins de base sont uniques et pointent vers les vraies routes", () => {
		const paths = KINDS.map((kind) => TAXONOMY_CONFIG[kind].basePath);
		expect(new Set(paths).size).toBe(paths.length);
		expect(paths).toEqual([
			"/admin/catalogue/couleurs",
			"/admin/catalogue/materiaux",
			"/admin/catalogue/types-de-produits",
		]);
	});

	// `formFields` est la source la plus fragile du registre : les Server Actions
	// lisent le champ par son NOM. Un `toggleId` erroné produit un formulaire que
	// l'action rejette en validation, sans que rien ne le signale à la compilation.
	it("formFields correspond aux noms de champs attendus par chaque Server Action", () => {
		expect(TAXONOMY_CONFIG.color.formFields).toEqual({
			duplicateId: "colorId",
			toggleId: "id",
			deleteId: "id",
		});
		expect(TAXONOMY_CONFIG.material.formFields).toEqual({
			duplicateId: "materialId",
			toggleId: "id",
			deleteId: "id",
		});
		expect(TAXONOMY_CONFIG["product-type"].formFields).toEqual({
			duplicateId: "productTypeId",
			toggleId: "productTypeId",
			deleteId: "productTypeId",
		});
	});

	it("`hasHex` n'est vrai que pour les couleurs", () => {
		expect(TAXONOMY_CONFIG.color.hasHex).toBe(true);
		expect(TAXONOMY_CONFIG.material.hasHex).toBe(false);
		expect(TAXONOMY_CONFIG["product-type"].hasHex).toBe(false);
	});

	it("`hasSystemFlag` n'est vrai que pour les types de bijoux", () => {
		// Seul `ProductType` porte la colonne `isSystem` (cf. schema.prisma).
		expect(TAXONOMY_CONFIG["product-type"].hasSystemFlag).toBe(true);
		expect(TAXONOMY_CONFIG.color.hasSystemFlag).toBe(false);
		expect(TAXONOMY_CONFIG.material.hasSystemFlag).toBe(false);
	});

	it("seules les couleurs sont marquées féminin", () => {
		expect(TAXONOMY_CONFIG.color.labels.feminine).toBe(true);
		expect(TAXONOMY_CONFIG.material.labels.feminine).toBe(false);
		expect(TAXONOMY_CONFIG["product-type"].labels.feminine).toBe(false);
	});
});

describe("getTaxonomyConfig", () => {
	it.each(KINDS)("%s : renvoie l'entrée du registre", (kind) => {
		expect(getTaxonomyConfig(kind)).toBe(TAXONOMY_CONFIG[kind]);
	});
});

describe("agree", () => {
	it("accorde au féminin pour une couleur", () => {
		expect(agree(TAXONOMY_CONFIG.color, "supprimé")).toBe("supprimée");
		expect(agree(TAXONOMY_CONFIG.color, "dupliqué")).toBe("dupliquée");
	});

	it("gère la terminaison en -if", () => {
		expect(agree(TAXONOMY_CONFIG.color, "Actif")).toBe("Active");
		expect(agree(TAXONOMY_CONFIG.color, "inactif")).toBe("inactive");
	});

	it("laisse le masculin inchangé", () => {
		expect(agree(TAXONOMY_CONFIG.material, "supprimé")).toBe("supprimé");
		expect(agree(TAXONOMY_CONFIG.material, "Actif")).toBe("Actif");
		expect(agree(TAXONOMY_CONFIG["product-type"], "désactivé")).toBe("désactivé");
	});
});

describe("formatUsage", () => {
	it("accorde le pluriel au-delà de 1", () => {
		expect(formatUsage(TAXONOMY_CONFIG.color, 3)).toBe("3 variantes");
		expect(formatUsage(TAXONOMY_CONFIG["product-type"], 2)).toBe("2 produits");
	});

	it("reste au singulier à 1", () => {
		expect(formatUsage(TAXONOMY_CONFIG.color, 1)).toBe("1 variante");
		expect(formatUsage(TAXONOMY_CONFIG["product-type"], 1)).toBe("1 produit");
	});

	it("garde le singulier à 0 (convention française)", () => {
		// « 0 variante », pas « 0 variantes ».
		expect(formatUsage(TAXONOMY_CONFIG.material, 0)).toBe("0 variante");
	});

	it("compte des produits pour les types, des variantes pour couleurs/matériaux", () => {
		// Ce n'est pas cosmétique : un type de bijou est rattaché à des Product,
		// une couleur à des ProductSku.
		expect(formatUsage(TAXONOMY_CONFIG["product-type"], 4)).toContain("produits");
		expect(formatUsage(TAXONOMY_CONFIG.color, 4)).toContain("variantes");
		expect(formatUsage(TAXONOMY_CONFIG.material, 4)).toContain("variantes");
	});
});
