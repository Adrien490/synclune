/**
 * F7 (audit validation Zod 2026-07-06) — parité client/serveur du sign-up.
 *
 * Le formulaire dupliquait la validation en validators inline (regex email
 * maison `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` divergente de `z.email()`, min
 * password codé en dur). `signUpEmailClientSchema` dérive désormais chaque
 * champ de `signUpEmailSchema.shape.*` — ce test verrouille la parité :
 * tout input accepté côté client doit l'être côté serveur (et inversement),
 * hors `acceptTerms` (boolean client vs string FormData serveur, assumé).
 */
import { describe, it, expect } from "vitest";
import { signUpEmailSchema, signUpEmailClientSchema } from "../auth.schemas";

function serverAccepts(field: "email" | "password" | "name", value: string): boolean {
	return signUpEmailSchema.shape[field].safeParse(value).success;
}

function clientAccepts(field: "email" | "password" | "name", value: string): boolean {
	return signUpEmailClientSchema.shape[field].safeParse(value).success;
}

describe("signUpEmailClientSchema — parité client/serveur", () => {
	const CASES: Array<["email" | "password" | "name", string]> = [
		// email
		["email", "a@b.co"],
		["email", "user+tag@domaine.fr"],
		["email", "user@localhost"], // sans TLD — z.email() tranche des deux côtés
		["email", "pas-un-email"],
		["email", ""],
		["email", "UPPER@DOMAINE.FR"],
		// password
		["password", "1234567"], // 7 chars — rejeté des deux côtés
		["password", "12345678"],
		["password", "x".repeat(128)],
		["password", "x".repeat(129)],
		// name
		["name", "A"],
		["name", "Jo"],
		["name", "x".repeat(100)],
		["name", "x".repeat(101)],
		["name", ""],
	];

	it.each(CASES)("champ %s : verdict identique client/serveur pour %j", (field, value) => {
		expect(clientAccepts(field, value)).toBe(serverAccepts(field, value));
	});

	it("les champs client SONT les champs serveur (même référence, zéro drift possible)", () => {
		expect(signUpEmailClientSchema.shape.email).toBe(signUpEmailSchema.shape.email);
		expect(signUpEmailClientSchema.shape.password).toBe(signUpEmailSchema.shape.password);
		expect(signUpEmailClientSchema.shape.name).toBe(signUpEmailSchema.shape.name);
	});

	describe("acceptTerms (boolean client vs string serveur, divergence assumée)", () => {
		it("client : literal true seul accepté", () => {
			expect(signUpEmailClientSchema.shape.acceptTerms.safeParse(true).success).toBe(true);
			expect(signUpEmailClientSchema.shape.acceptTerms.safeParse(false).success).toBe(false);
			expect(signUpEmailClientSchema.shape.acceptTerms.safeParse("true").success).toBe(false);
		});

		it('serveur : string "true" seule acceptée (FormData)', () => {
			expect(signUpEmailSchema.shape.acceptTerms.safeParse("true").success).toBe(true);
			expect(signUpEmailSchema.shape.acceptTerms.safeParse("false").success).toBe(false);
			expect(signUpEmailSchema.shape.acceptTerms.safeParse(true).success).toBe(false);
		});
	});
});
