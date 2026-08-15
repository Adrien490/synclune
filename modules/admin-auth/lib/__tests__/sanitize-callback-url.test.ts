import { describe, expect, it } from "vitest";
import { sanitizeCallbackURL } from "../sanitize-callback-url";

describe("sanitizeCallbackURL", () => {
	it.each([
		["/admin", "/admin"],
		["/admin/ventes/commandes", "/admin/ventes/commandes"],
		["/admin/catalogue/produits?page=2", "/admin/catalogue/produits?page=2"],
	])("accepte une destination admin (%s)", (input, expected) => {
		expect(sanitizeCallbackURL(input)).toBe(expected);
	});

	it.each([
		["absente", undefined],
		["vide", ""],
		["hors admin", "/produits"],
		["préfixe trompeur", "/administration"],
		["URL absolue", "https://evil.example/admin"],
		["protocole relatif", "//evil.example/admin"],
	])("retombe sur /admin (%s)", (_label, input) => {
		expect(sanitizeCallbackURL(input)).toBe("/admin");
	});

	it.each([
		["remontée de chemin", "/admin/../confidentialite"],
		["remontée en profondeur", "/admin/ventes/../../produits"],
		["antislash", "/admin/..\\confidentialite"],
	])("rejette la remontée de chemin (%s)", (_label, input) => {
		// `/admin/..` passe le test de préfixe mais le navigateur le normalise
		// hors de l'admin — la valeur retombe sur /admin.
		expect(sanitizeCallbackURL(input)).toBe("/admin");
	});
});
