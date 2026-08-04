/**
 * @regression field-name-id-contract
 *
 * Contrat : chaque field component TanStack rend son contrôle avec
 * `id === field.name`.
 *
 * Ce n'est pas un détail d'implémentation mais une API consommée : ~20 call
 * sites posent un label EXTERNE via `<FieldLabel htmlFor={field.name}>`
 * (discount-code-section, discount-conditions-section, create/edit-product-info-card,
 * color-form-fields, status-card…) ou un littéral (`htmlFor="customerEmail"`,
 * `htmlFor="carrier"`), et le JSDoc d'`InputGroupField` documente ce pattern
 * comme LE moyen de labelliser un champ sans `label` intégré. Un composant qui
 * dériverait son id autrement (préfixe `useId()`…) orphelinerait tous ces
 * labels EN SILENCE : aucune erreur tsc, aucun test rouge, juste des champs
 * sans nom accessible (WCAG 4.1.2). Envisagé puis écarté à l'audit InputField
 * 2026-08-03 (P2-2) — la collision d'ids reste LATENTE (aucune page ne monte
 * deux formulaires aux field names identiques), l'orphelinage, lui, serait
 * immédiat.
 *
 * Corollaire à la charge des pages : ne jamais monter SIMULTANÉMENT deux
 * formulaires partageant un field name (les paires create/edit en ternaire
 * sont saines ; un rendu côte à côte ne l'est pas).
 *
 * Scan de source (pas de rendu) : le contrat est structurel et certains
 * composants (Select Radix, Calendar popover) sont coûteux à monter en jsdom.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const FORMS_DIR = join(__dirname, "..");

const read = (relPath: string) => readFileSync(join(FORMS_DIR, relPath), "utf8");

/**
 * Composants qui posent l'id directement sur leur contrôle.
 * `datetime-field` et `select-field` le posent sur la variante native
 * (mobile) et exposent le label à la variante desktop via `aria-labelledby`.
 */
const DIRECT_ID_COMPONENTS = [
	"checkbox-field.tsx",
	"datetime-field.tsx",
	"input-field.tsx",
	"input-group-field.tsx",
	"multi-select-field.tsx",
	"password-input-field.tsx",
	"phone-field.tsx",
	"select-field.tsx",
	"switch-field.tsx",
	"textarea-field.tsx",
] as const;

describe("contrat id === field.name des field components", () => {
	it.each(DIRECT_ID_COMPONENTS)("%s pose id={field.name} sur son contrôle", (file) => {
		expect(read(file)).toContain("id={field.name}");
	});

	it("autocomplete-field délègue le contrat via name={field.name} → Autocomplete id={name}", () => {
		// Le composant Autocomplete pose lui-même `id={name}` sur son Input :
		// AutocompleteField honore le contrat en lui transmettant `field.name`.
		expect(read("autocomplete-field.tsx")).toContain("name={field.name}");
		const autocomplete = readFileSync(
			join(FORMS_DIR, "..", "autocomplete", "autocomplete.tsx"),
			"utf8",
		);
		expect(autocomplete).toContain("id={name}");
	});

	it("radio-group-field (exemption : pas de contrôle unique) dérive ses ids d'option de field.name", () => {
		// Un radio group n'a pas UN contrôle à labelliser : le nom accessible
		// passe par `aria-labelledby={labelId}` et chaque option porte
		// `${field.name}-${option.value}`.
		const source = read("radio-group-field.tsx");
		expect(source).toContain("`${field.name}-${option.value}`");
		expect(source).toContain("aria-labelledby");
	});
});
