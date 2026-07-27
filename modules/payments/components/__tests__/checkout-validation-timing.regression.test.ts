import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression checkout-validation-timing-2026-07-26
 *
 * Le checkout validait CHAQUE champ à la frappe (`validators: { onChange }`), et
 * `InputField` affiche l'erreur dès que `meta.errors` est non vide — sans gate
 * `isTouched`. Taper « J » dans « Nom complet » affichait donc aussitôt « …au moins
 * 2 caractères », « a » dans l'email « Entre une adresse email valide », « 7 » dans
 * le code postal « Code postal invalide ». Chaque champ engueulait l'utilisateur
 * pendant qu'il le remplissait. Audit UI/UX paiement 2026-07-26, F1.
 *
 * Correctif : `revalidateLogic({ mode: "blur", modeAfterSubmission: "change" })` sur
 * l'instance de formulaire du checkout.
 *
 * ⚠️ CE QUI REND CE GARDE-FOU NÉCESSAIRE : `revalidateLogic` **compose** avec
 * `defaultValidationLogic`, elle ne la remplace pas. Un nouveau champ déclaré en
 * `validators: { onChange }` continuerait donc de valider à chaque frappe — en
 * silence, à côté des champs migrés. La seule clé lue par `revalidateLogic` est
 * `onDynamic`.
 *
 * Le pendant comportemental est `checkout-inline-validation.regression.test.tsx`
 * (monte le vrai formulaire et vérifie l'absence d'erreur à la frappe).
 */

const REPO_ROOT = process.cwd();

const FORM_HOOK = "modules/payments/hooks/use-checkout-form.ts";
const FIELD_FILES = [
	"modules/payments/components/checkout-address-fields.tsx",
	"modules/payments/components/checkout-contact-section.tsx",
];

function read(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), "utf-8");
}

/** Retire commentaires de bloc, JSX et ligne — la prose ne doit pas faire échouer. */
function stripComments(source: string): string {
	return source
		.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/\/\/.*$/gm, "");
}

describe("Checkout — validation au blur, pas à la frappe", () => {
	describe("use-checkout-form.ts", () => {
		const source = stripComments(read(FORM_HOOK));

		it("importe revalidateLogic de @tanstack/react-form", () => {
			expect(source).toMatch(
				/import\s*\{[^}]*\brevalidateLogic\b[^}]*\}\s*from\s*["']@tanstack\/react-form["']/,
			);
		});

		it('passe validationLogic avec mode: "blur" à useAppForm', () => {
			expect(source).toMatch(/validationLogic:\s*revalidateLogic\(/);
			expect(source).toMatch(/mode:\s*["']blur["']/);
		});

		it("garde modeAfterSubmission: \"change\" (l'erreur s'efface au fil de la correction)", () => {
			expect(source).toMatch(/modeAfterSubmission:\s*["']change["']/);
		});
	});

	describe("validateurs de champs", () => {
		it("le regex de détection mord réellement (garde-fou du garde-fou)", () => {
			const onChangeValidator = /validators=\{\{\s*onChange:/;
			expect(onChangeValidator.test("validators={{\n\t\tonChange: ({ value }) => {}")).toBe(true);
			expect(onChangeValidator.test("validators={{\n\t\tonDynamic: ({ value }) => {}")).toBe(false);
		});

		for (const file of FIELD_FILES) {
			it(`${file} ne déclare AUCUN validateur onChange`, () => {
				const stripped = stripComments(read(file));
				expect(stripped).not.toMatch(/validators=\{\{\s*onChange:/);
			});

			it(`${file} déclare ses validateurs en onDynamic`, () => {
				const stripped = stripComments(read(file));
				expect(stripped).toMatch(/validators=\{\{\s*onDynamic:/);
			});
		}

		it("les 7 validateurs du tunnel sont bien tous migrés (compte exact)", () => {
			// Sans compte exact, un fichier dont tous les validateurs auraient été
			// SUPPRIMÉS passerait les deux assertions ci-dessus.
			const total = FIELD_FILES.reduce((sum, file) => {
				const matches = stripComments(read(file)).match(/onDynamic:/g) ?? [];
				return sum + matches.length;
			}, 0);
			expect(total).toBe(7);
		});
	});
});
