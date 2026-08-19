import { describe, expect, it } from "vitest";

import { TAXONOMY_CONFIG } from "../../config/taxonomy.config";
import { agree, formatUsage } from "../taxonomy-labels";

const COLOR = TAXONOMY_CONFIG.color; // féminin
const MATERIAL = TAXONOMY_CONFIG.material; // masculin
const PRODUCT_TYPE = TAXONOMY_CONFIG["product-type"]; // masculin

describe("agree", () => {
	it("laisse le masculin intact", () => {
		expect(agree(MATERIAL, "supprimé")).toBe("supprimé");
		expect(agree(PRODUCT_TYPE, "Aucun")).toBe("Aucun");
	});

	it("ajoute un « e » au féminin (cas régulier)", () => {
		expect(agree(COLOR, "supprimé")).toBe("supprimée");
		expect(agree(COLOR, "Aucun")).toBe("Aucune");
		expect(agree(COLOR, "trouvé")).toBe("trouvée");
	});

	it("traite la terminaison en « -if », seule irrégularité couverte", () => {
		expect(agree(COLOR, "Actif")).toBe("Active");
		expect(agree(COLOR, "Inactif")).toBe("Inactive");
		// …et ne la déclenche pas au masculin.
		expect(agree(MATERIAL, "Actif")).toBe("Actif");
	});

	it("compose une phrase d'état vide accordée", () => {
		expect(`${agree(COLOR, "Aucun")} ${COLOR.labels.singular} ${agree(COLOR, "trouvé")}`).toBe(
			"Aucune couleur trouvée",
		);
		expect(
			`${agree(MATERIAL, "Aucun")} ${MATERIAL.labels.singular} ${agree(MATERIAL, "trouvé")}`,
		).toBe("Aucun matériau trouvé");
	});
});

describe("formatUsage", () => {
	it("garde le singulier à zéro ET à un — c'est la règle française", () => {
		expect(formatUsage(COLOR, 0)).toBe("0 variante");
		expect(formatUsage(COLOR, 1)).toBe("1 variante");
	});

	it("passe au pluriel à partir de deux", () => {
		expect(formatUsage(COLOR, 2)).toBe("2 variantes");
		expect(formatUsage(COLOR, 17)).toBe("17 variantes");
	});

	it("utilise l'unité comptée de la taxonomie", () => {
		expect(formatUsage(PRODUCT_TYPE, 1)).toBe("1 produit");
		expect(formatUsage(PRODUCT_TYPE, 3)).toBe("3 produits");
	});
});
