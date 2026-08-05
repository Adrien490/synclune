/**
 * @regression pointer-capability-ssot
 *
 * La capacité de pointeur était décrite à quatre endroits, en quatre chaînes
 * écrites à la main : le `@custom-variant can-hover` d'`app/globals.css`, une
 * constante privée de `gallery/hover-zoom.tsx`, `TOUCH_MEDIA_QUERY` dans
 * `use-touch-device.ts`, et un littéral dans `cursor-pagination.tsx`.
 *
 * Le commentaire de la galerie affirmait « même capacité que le variant
 * `can-hover:` ». C'était vrai — par coïncidence de deux chaînes que rien ne
 * reliait. Un composant HYBRIDE (branche JS + classe `can-hover:`) est
 * exactement le cas où cette coïncidence coûte cher : les deux moitiés
 * divergeraient en silence sur les appareils qu'aucune des deux ne décrit
 * franchement (portable tactile). C'est le même défaut de fond que les seuils de
 * largeur en px, verrouillé de la même façon — cf.
 * `no-px-media-query.regression.test.ts`, dont ce fichier reprend le patron
 * d'ancrage.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { FINE_POINTER_QUERY, HOVER_CAPABLE_QUERY, TOUCH_QUERY } from "@/shared/constants/pointer";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const GLOBALS = readFileSync(join(REPO_ROOT, "app/globals.css"), "utf-8");

/** Normalise les espaces : `(hover:hover)` et `(hover: hover)` sont la même requête. */
function normalize(query: string): string {
	return query.replace(/\s+/g, " ").replace(/\(\s+/g, "(").replace(/\s+\)/g, ")").trim();
}

/**
 * Lit un fichier **sans ses commentaires**.
 *
 * ⚠️ Non négociable pour un garde-fou qui scanne du texte : `hover-zoom.tsx` et
 * `use-haptic.ts` CITENT tous les deux la requête interdite dans le commentaire
 * qui explique pourquoi elle est piégeuse. Un scan brut échoue donc sur sa propre
 * documentation, et la seule façon de le « réparer » serait d'effacer
 * l'explication — c'est-à-dire de garder le quoi et de perdre le pourquoi. Le
 * dépôt s'est déjà fait prendre deux fois ; même parade que
 * `gallery-chrome-off-photo.regression.test.ts`.
 */
function readWithoutComments(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), "utf-8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

describe("@regression pointer-capability-ssot", () => {
	describe("ancrage sur le CSS", () => {
		it("HOVER_CAPABLE_QUERY est exactement la condition du @custom-variant can-hover", () => {
			const match = /@custom-variant\s+can-hover\s*\(\s*@media\s+(.*?)\s*\)\s*;/.exec(GLOBALS);

			expect(
				match?.[1],
				"Le `@custom-variant can-hover` d'app/globals.css est introuvable ou a changé de\n" +
					"forme. C'est lui l'ancre : sans lui, ce test passerait à vide.",
			).toBeDefined();

			expect(
				normalize(match![1]!),
				"`HOVER_CAPABLE_QUERY` et le variant `can-hover:` doivent décrire LA MÊME\n" +
					"capacité. Un composant hybride (branche JS + classe `can-hover:`) se scinde en\n" +
					"deux moitiés qui ne s'accordent plus dès qu'elles divergent — et ça ne se voit\n" +
					"que sur les appareils qu'aucune des deux ne décrit franchement.",
			).toBe(normalize(HOVER_CAPABLE_QUERY));
		});
	});

	describe("les trois prédicats restent distincts", () => {
		// Le piège central : croire que « tactile » est la négation de « sait
		// survoler ». Un portable Windows à écran tactile a pour pointeur PRIMAIRE
		// son trackpad — il est donc FAUX pour les deux. C'est cette classe
		// d'appareils qui avait fait revenir le zoom collé de la galerie après le
		// correctif iPad.
		it("HOVER_CAPABLE_QUERY et TOUCH_QUERY ne sont pas la négation l'un de l'autre", () => {
			expect(TOUCH_QUERY).not.toContain("not ");
			expect(HOVER_CAPABLE_QUERY).not.toContain("not ");
			expect(TOUCH_QUERY).not.toBe(HOVER_CAPABLE_QUERY);
		});

		it("FINE_POINTER_QUERY ne parle QUE du pointeur, jamais du survol", () => {
			expect(
				FINE_POINTER_QUERY.includes("hover"),
				"`FINE_POINTER_QUERY` répond à « les raccourcis souris/clavier ont-ils un sens ? ».\n" +
					"Y ajouter `hover` le confondrait avec `HOVER_CAPABLE_QUERY` et changerait le\n" +
					"comportement de `cursor-pagination` sur stylet actif.",
			).toBe(false);
		});
	});

	describe("plus de littéral de capacité hors de la SSOT", () => {
		// Les fichiers qui DÉCLARENT la SSOT (ou l'expliquent) sont exclus : ils
		// citent forcément les chaînes.
		const ALLOWED = new Set([
			"shared/constants/pointer.ts",
			"shared/constants/__tests__/pointer-capability-ssot.regression.test.ts",
			"app/globals.css",
		]);

		it("aucun composant TS/TSX ne réécrit une media query de capacité à la main", async () => {
			const { globSync } = await import("node:fs");
			const files = globSync("{app,modules,shared}/**/*.{ts,tsx}", { cwd: REPO_ROOT })
				.filter((f) => !/\.(test|spec)\.tsx?$/.test(f) && !f.includes("node_modules"))
				.map((f) => f.replace(/\\/g, "/"));

			expect(files.length, "Le scan est vide — le glob a dû casser.").toBeGreaterThan(500);

			const offenders = files.filter((file) => {
				if (ALLOWED.has(file)) return false;
				return /["'`]\([^"'`]*\b(?:hover|pointer)\s*:\s*(?:hover|none|fine|coarse)\b[^"'`]*\)["'`]/.test(
					readWithoutComments(file),
				);
			});

			expect(
				offenders,
				"Ces fichiers écrivent une media query de capacité en littéral. Importer\n" +
					"`HOVER_CAPABLE_QUERY` / `TOUCH_QUERY` / `FINE_POINTER_QUERY` depuis\n" +
					"`@/shared/constants/pointer` — c'est ce qui garde la branche JS et le variant\n" +
					"CSS `can-hover:` d'accord sur les appareils hybrides.",
			).toEqual([]);
		});
	});
});
