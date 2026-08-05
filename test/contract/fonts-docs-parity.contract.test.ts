import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Parité fonts.ts ↔ docs/emails — le filet qui N'EXISTAIT PAS.
 *
 * L'audit typo du 2026-08-05 (docs/FONTS-AUDIT-2026-08-05.md, friction 5) a
 * montré que `claude-md-accuracy.contract.test.ts` ne vérifie que des CHEMINS
 * de fichiers backtickés — jamais un nom de police : après une migration, les
 * prompts pouvaient continuer d'affirmer « Fraunces » sans qu'aucun test ne
 * rougisse. Ce contrat dérive les familles COURANTES de la SSOT
 * `shared/styles/fonts.ts` et exige que les documents qui décrivent l'état
 * courant les nomment, et ne nomment plus les familles SORTIES.
 *
 * À chaque migration de police : ajouter les familles sortantes à
 * `PAST_FAMILIES` — c'est ce qui rend la dérive détectable la fois suivante.
 */

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const fontsSource = read("shared/styles/fonts.ts");
const importMatch = fontsSource.match(/import\s*\{([^}]+)\}\s*from\s*"next\/font\/google"/);
const FAMILIES = (importMatch?.[1] ?? "")
	.split(",")
	.map((name) => name.trim())
	.filter(Boolean)
	.map((exportName) => exportName.replace(/_/g, " "));

/** Familles qui ont QUITTÉ le repo — une mention dans un doc d'état courant est une dérive. */
const PAST_FAMILIES = ["Fraunces", "Figtree", "Sacramento"];

/** Documents qui listent le TRIO complet comme état courant. */
const TRIO_DOCS = [
	"docs/prompts/DESIGN-ARTIFACT-PROMPT.md",
	"docs/prompts/REDESIGN-PROMPT.md",
	"docs/prompts/AUDIT-PROMPTS.md",
	"docs/UI-CONVENTIONS.md",
];

/**
 * Documents d'état courant où les familles SORTIES n'ont plus leur place.
 * `docs/UI-CONVENTIONS.md` n'y figure pas : il porte des leçons HISTORIQUES
 * qui nomment les anciennes familles à dessein (incident fraunces-wonk,
 * candidats écartés à l'audit).
 */
const NO_PAST_DOCS = [
	"docs/prompts/DESIGN-ARTIFACT-PROMPT.md",
	"docs/prompts/REDESIGN-PROMPT.md",
	"docs/prompts/AUDIT-PROMPTS.md",
	"docs/prompts/README.md",
];

describe("parité fonts.ts ↔ docs", () => {
	it("la SSOT déclare exactement trois familles Google", () => {
		expect(FAMILIES).toHaveLength(3);
	});

	it.each(TRIO_DOCS)("%s nomme les trois familles courantes", (doc) => {
		const content = read(doc);
		for (const family of FAMILIES) {
			expect(content, `${doc} ne nomme pas « ${family} »`).toContain(family);
		}
	});

	it("docs/prompts/README.md nomme la display courante", () => {
		expect(read("docs/prompts/README.md")).toContain(FAMILIES[0]!);
	});

	it.each(NO_PAST_DOCS)("%s ne nomme plus aucune famille sortie", (doc) => {
		const content = read(doc);
		for (const past of PAST_FAMILIES) {
			expect(content, `${doc} mentionne encore « ${past} »`).not.toContain(past);
		}
	});
});

describe("parité fonts.ts ↔ emails", () => {
	it("EMAIL_FONT_FAMILY.display porte la display courante", () => {
		expect(read("emails/email-colors.ts")).toContain(`'${FAMILIES[0]!}'`);
	});

	it("l'@import Google Fonts des emails charge la display courante", () => {
		const layout = read("emails/_components/email-layout.tsx");
		expect(layout).toContain(`family=${FAMILIES[0]!.replace(/ /g, "+")}`);
		for (const past of PAST_FAMILIES) {
			expect(layout, `l'@import email charge encore « ${past} »`).not.toContain(past);
		}
	});
});
