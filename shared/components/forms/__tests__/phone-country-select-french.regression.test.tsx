/**
 * @regression phone-country-select-french-2026-08-07
 *
 * Le sélecteur de pays du champ téléphone doit être nommé et peuplé en FRANÇAIS.
 *
 * ## Le bug que ce test verrouille
 *
 * `PhoneInputWithFlags` ne passait aucune prop `labels` à
 * `react-phone-number-input`. La lib retombe alors sur `locale/en.json`, dont la
 * clé `country` vaut `"Phone number country"` : le `<select>` des indicatifs —
 * **245 options, aucun `<label>`, aucun libellé visible** — s'annonçait en
 * anglais au milieu d'un formulaire `lang="fr"`, et listait « Germany »,
 * « Spain », « Albania »… (mesuré dans le DOM rendu de `/paiement` le
 * 2026-08-07).
 *
 * C'était le seul contrôle du tunnel de paiement nommé en anglais.
 * WCAG 3.1.2 (Langue d'un passage) et 2.4.6 (En-têtes et étiquettes).
 *
 * ## Méthode
 *
 * Les libellés sont **dérivés du module réel** (`locale/fr.json` + la surcharge
 * du composant), jamais recopiés : un test qui répète une constante ne peut pas
 * voir qu'elle est fausse.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "react-phone-number-input/locale/en.json";
import fr from "react-phone-number-input/locale/fr.json";

const SOURCE = readFileSync(join(__dirname, "..", "phone-input-lazy.tsx"), "utf-8");

/**
 * ⚠️ Le code SANS les commentaires.
 *
 * Le docblock de `phone-input-lazy.tsx` CITE `"Phone number country"` pour
 * expliquer le bug — un scan naïf de la source entière se déclencherait donc sur
 * sa propre documentation. Même piège que le garde-fou de version Stripe, qui
 * scannait la prose de ses commentaires.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

describe("Sélecteur de pays du champ téléphone", () => {
	it("passe des libellés à react-phone-number-input", () => {
		// Sans `labels`, la lib retombe sur l'anglais — c'est le défaut d'origine.
		expect(CODE).toMatch(/<PhoneInput\s+labels=\{PHONE_LABELS_FR\}/);
		expect(CODE).toContain('from "react-phone-number-input/locale/fr.json"');
	});

	it("n'expose JAMAIS le libellé anglais du sélecteur", () => {
		// La chaîne exacte qui était annoncée aux lecteurs d'écran.
		expect(en.country).toBe("Phone number country");
		expect(
			CODE.includes(en.country),
			"Le libellé anglais du sélecteur de pays est de retour dans le code.",
		).toBe(false);
	});

	it("surcharge la clé `country` par un libellé français intelligible", () => {
		const override = CODE.match(/country: "([^"]+)"/)?.[1];
		expect(override, "La surcharge de `country` a disparu").toBeTruthy();

		// Français, et pas la traduction littérale de la lib.
		expect(override).not.toBe(en.country);
		expect(override).not.toBe(fr.country);
		expect(override).toMatch(/pays/i);
	});

	it("hérite de la table de pays française (245 entrées, pas l'anglaise)", () => {
		// La surcharge est un spread : les noms de pays viennent de fr.json.
		expect(CODE).toMatch(/\{ \.\.\.fr, country:/);

		// Contrôle de sens : les deux tables diffèrent bien sur des pays courants.
		expect(fr.DE).toBe("Allemagne");
		expect(en.DE).toBe("Germany");
		expect(fr.ES).toBe("Espagne");
	});
});
