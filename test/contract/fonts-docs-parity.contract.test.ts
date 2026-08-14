import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Parité fonts.ts ↔ emails — le filet qui N'EXISTAIT PAS.
 *
 * L'audit typo du 2026-08-05 (friction 5) a montré qu'aucun contrat ne
 * vérifiait un nom de police : après une migration, une surface pouvait
 * continuer d'affirmer « Fraunces » sans qu'aucun test ne rougisse. Ce contrat
 * dérive les familles COURANTES de la SSOT `shared/styles/fonts.ts` et exige
 * que les surfaces qui les recopient — les emails, dont les styles sont inline
 * et échappent donc aux tokens — nomment la display courante et plus aucune
 * famille SORTIE.
 *
 * À chaque migration de police : ajouter les familles sortantes à
 * `PAST_FAMILIES` — c'est ce qui rend la dérive détectable la fois suivante.
 *
 * ⚠️ Le volet « docs » de ce contrat est parti au lot 0 de la migration lean
 * (2026-08-14) : ses quatre sujets vivaient dans `docs/prompts/`, supprimé avec
 * les plans d'audit antérieurs. Aucun document survivant ne nomme de police —
 * si l'un s'y remet, le re-verrouiller ici.
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

describe("parité fonts.ts ↔ emails", () => {
	it("la SSOT déclare exactement trois familles Google", () => {
		expect(FAMILIES).toHaveLength(3);
	});

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
