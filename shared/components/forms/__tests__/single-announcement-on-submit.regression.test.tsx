/**
 * @regression single-announcement-on-submit-2026-08-07
 *
 * À la soumission d'un formulaire, **une seule** région live doit parler.
 *
 * ## Le bug que ce test verrouille
 *
 * Mesuré sur `/paiement` le 2026-08-07, formulaire vide soumis : **sept** régions
 * live se peuplaient dans le même tick —
 *
 * - 1 × `role="alert"` `aria-live="assertive"` : le résumé (« 6 erreurs trouvées »)
 * - 6 × `role="alert"` `aria-live="polite"` : une par champ invalide
 *
 * — pendant que le focus se déplaçait vers le premier champ invalide. Un lecteur
 * d'écran interrompt les `polite` avec l'`assertive` puis bouscule les `polite`
 * entre elles : au moment précis où l'utilisateur a besoin d'être guidé, la
 * vocalisation est brouillée. En état initial, **neuf** `role="alert"` vides
 * étaient déjà montées en permanence (une par champ).
 *
 * Le message d'un champ n'a de toute façon pas besoin d'une région live à la
 * soumission : il est relu via `aria-describedby` quand le focus arrive sur le
 * champ, et le résumé le liste déjà.
 *
 * ## L'invariant
 *
 * `useFieldErrorVisibility` sépare `visible` (afficher) de `announce` (vocaliser).
 * `announce` est faux dès qu'une soumission a été tentée ; les field components
 * le passent à `FieldError`, qui retire alors `role`/`aria-live`/`aria-atomic`
 * **sans démonter le nœud** (il reste la cible de l'`aria-describedby`).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FORMS = join(__dirname, "..");
const UI = join(__dirname, "..", "..", "ui");

const read = (p: string) => readFileSync(p, "utf-8");

/** Les field components qui rendent un `<FieldError>`. */
const FIELD_COMPONENTS = readdirSync(FORMS)
	.filter((f) => f.endsWith("-field.tsx"))
	.filter((f) => read(join(FORMS, f)).includes("<FieldError"));

describe("Une seule annonce à la soumission", () => {
	it("le hook distingue `visible` de `announce`", () => {
		const hook = read(join(FORMS, "use-field-error-visibility.ts"));

		expect(hook).toMatch(/announce:\s*visible && submissionAttempts === 0/);
		expect(hook).toMatch(/visible:\s*boolean/);
		expect(hook).toMatch(/announce:\s*boolean/);
	});

	it("scanne bien tous les field components", () => {
		// Contrôle de sens : si le glob casse, le test ci-dessous devient vacant.
		expect(FIELD_COMPONENTS.length).toBeGreaterThanOrEqual(10);
		expect(FIELD_COMPONENTS).toContain("input-field.tsx");
		expect(FIELD_COMPONENTS).toContain("select-field.tsx");
		expect(FIELD_COMPONENTS).toContain("phone-field.tsx");
	});

	it("chaque field component câble `live` sur TOUS ses <FieldError>", () => {
		const offenders: string[] = [];

		for (const file of FIELD_COMPONENTS) {
			const source = read(join(FORMS, file));
			const total = (source.match(/<FieldError/g) ?? []).length;
			const wired = (source.match(/<FieldError\s+live=\{announce\}/g) ?? []).length;

			if (total !== wired) offenders.push(`${file} (${wired}/${total})`);
			if (!source.includes("visible: hasError") && !source.includes("visible: hasErrors")) {
				offenders.push(`${file} (retour du hook non déstructuré)`);
			}
		}

		expect(offenders, "Ces champs vocaliseraient leur erreur en même temps que le résumé.").toEqual(
			[],
		);
	});

	it("`FieldError` retire les attributs de région live mais GARDE le nœud", () => {
		const field = read(join(UI, "field.tsx"));

		expect(field).toMatch(/role=\{live \? "alert" : undefined\}/);
		expect(field).toMatch(/aria-live=\{live \? "polite" : undefined\}/);
		expect(field).toMatch(/aria-atomic=\{live \? "true" : undefined\}/);

		// Le nœud n'est JAMAIS démonté conditionnellement : il porte l'id ciblé par
		// `aria-describedby`. Le retirer rendrait le message illisible au focus.
		expect(field).not.toMatch(/\{live && </);
	});

	it("le résumé du checkout prend le focus et reste le canal unique", () => {
		const summary = read(join(FORMS, "error-summary.tsx"));
		const checkoutSummary = read(
			join(
				__dirname,
				"..",
				"..",
				"..",
				"..",
				"modules",
				"payments",
				"components",
				"checkout-error-summary.tsx",
			),
		);
		const checkoutForm = read(
			join(
				__dirname,
				"..",
				"..",
				"..",
				"..",
				"modules",
				"payments",
				"components",
				"checkout-form.tsx",
			),
		);

		expect(summary).toMatch(/tabIndex=\{-1\}/);
		expect(summary).toMatch(/el\.focus\(\{ preventScroll: true \}\)/);
		expect(checkoutSummary).toMatch(/focusOnAppear/);

		// ⚠️ Le tunnel ne doit PAS aussi focuser le premier champ invalide : les deux
		// se disputaient le focus. Commentaires exclus — ils citent le nom.
		const code = checkoutForm.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
		expect(code).not.toMatch(/focusFirstInvalid\(\)/);
	});
});
