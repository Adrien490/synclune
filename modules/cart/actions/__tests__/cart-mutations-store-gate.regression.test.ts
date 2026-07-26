/**
 * @regression cart-mutations-must-gate-on-store-closure
 *
 * AUDIT-BIZ-001 — `assertStoreOpen()` était appliqué de façon inégale sur les
 * mutations panier : `addToCart` / `updateCartItem` / `applyCartDiscount` étaient
 * gardés, mais `reorderFromOrder` — qui remplit le panier tout autant — ne
 * l'était pas. Un `ReorderButton` reste cliquable pendant une fermeture, car
 * l'espace client est délibérément accessible boutique fermée.
 *
 * Ce test verrouille la règle par CATÉGORIE plutôt qu'action par action : toute
 * action panier qui **ajoute ou augmente** des articles doit porter le gate. Une
 * nouvelle action de ce type sans gate fait échouer ce test.
 *
 * Les actions de retrait/nettoyage (remove*, clear, move-to-wishlist,
 * update-cart-prices) sont volontairement hors périmètre : les bloquer pendant
 * une fermeture piégerait le client avec un panier qu'il ne peut plus vider.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ACTIONS_DIR = join(__dirname, "..");

/**
 * Actions qui créent ou augmentent des lignes de panier → gate obligatoire.
 * Ajouter ici toute nouvelle action de ce type (et la garder, évidemment).
 */
const MUST_GATE = [
	"add-to-cart.ts",
	"update-cart-item.ts",
	"apply-cart-discount.ts",
	"reorder-from-order.ts",
];

/**
 * Actions délibérément NON gardées, avec la raison. Une action absente des deux
 * listes fait échouer le test « inventaire complet » ci-dessous : c'est le
 * mécanisme qui force la décision explicite sur toute nouvelle action.
 */
const INTENTIONALLY_UNGATED: Record<string, string> = {
	"clear-cart.ts": "vider son panier doit rester possible boutique fermée",
	"remove-from-cart.ts": "retrait d'article — jamais bloquant",
	"remove-multiple-items.ts": "retrait d'articles — jamais bloquant",
	"remove-unavailable-items.ts": "nettoyage d'articles indisponibles",
	"remove-cart-discount.ts": "retrait d'un code promo — jamais bloquant",
	"move-to-wishlist.ts": "déplace hors du panier (net retrait)",
	"update-cart-prices.ts": "resynchronise des prix, n'ajoute rien",
	"validate-cart.ts": "lecture seule (diagnostic de disponibilité)",
	"merge-carts.ts":
		"appelée par le hook post-login de Better Auth, pas par un geste d'achat : bloquer ferait perdre le panier invité au login",
	"set-fulfillment-mode.ts":
		"métadonnée de panier, déjà feature-gatée par StoreSettings.clickAndCollectEnabled (surface dormante)",
};

function listActionFiles(): string[] {
	return readdirSync(ACTIONS_DIR, { withFileTypes: true })
		.filter((e) => e.isFile() && e.name.endsWith(".ts"))
		.map((e) => e.name)
		.sort();
}

function readAction(fileName: string): string {
	return readFileSync(join(ACTIONS_DIR, fileName), "utf8");
}

describe("gate `assertStoreOpen` sur les mutations panier", () => {
	it("l'inventaire des actions est exhaustivement classé (gate requis vs exempté)", () => {
		const unclassified = listActionFiles().filter(
			(f) => !MUST_GATE.includes(f) && !(f in INTENTIONALLY_UNGATED),
		);

		expect(
			unclassified,
			`Action(s) panier non classée(s) : ${unclassified.join(", ")}. ` +
				"Ajoute-la à MUST_GATE (si elle ajoute/augmente des articles) ou à " +
				"INTENTIONALLY_UNGATED avec sa raison.",
		).toEqual([]);
	});

	it.each(MUST_GATE)("%s appelle assertStoreOpen()", (fileName) => {
		const source = readAction(fileName);
		expect(source).toContain("assertStoreOpen");
	});

	it.each(MUST_GATE)("%s court-circuite sur retour non-null du gate", (fileName) => {
		const source = readAction(fileName);
		// Contrat de `assertStoreOpen` : `null` = ouvert, objet = fermé. Appeler le
		// helper sans tester son retour serait un gate décoratif.
		expect(source).toMatch(/assertStoreOpen\(\)[\s\S]{0,120}?(if\s*\(|return)/);
	});

	it.each(Object.keys(INTENTIONALLY_UNGATED))("%s reste volontairement non gardée", (fileName) => {
		// Si quelqu'un ajoute le gate ici, ce n'est pas forcément un bug — mais ça
		// doit être une décision consciente, donc déplacer le fichier dans MUST_GATE.
		expect(readAction(fileName)).not.toContain("assertStoreOpen");
	});
});
