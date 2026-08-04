/**
 * @regression tailwind-arbitrary-class-ellipsis
 *
 * Une classe arbitraire ABRÉGÉE dans un commentaire met TOUT le site en 500.
 *
 * ## Ce qui s'est passé (2026-08-05)
 *
 * `app/admin/_components/admin-menu-sheet.tsx` documentait une fusion de classes
 * en écrivant, **dans un commentaire**, un `pb-` arbitraire dont l'argument `env()`
 * était remplacé par trois points ASCII — l'abréviation d'une classe réelle voisine.
 * (Le motif exact n'est pas reproduit ici : il casserait ce fichier comme il a cassé
 * l'autre. Il est reconstruit par concaténation dans le second test.)
 *
 * Tailwind v4 scanne les fichiers source **sans distinguer code et commentaire** :
 * il en a fait un candidat, généré
 *
 *     .pb-\[max\(0px\,env\(…\)\)\] { padding-bottom: max(0px, env(…)); }
 *
 * (avec de vrais points ASCII là où cet extrait montre une ellipse typographique)
 *
 * et cette unique déclaration invalide fait échouer le parsing de la feuille
 * ENTIÈRE (`Unexpected token Delim('.')`). Conséquence : `/produits`, `/cgv`,
 * l'admin — chaque page du site répond **500** en développement, pour un
 * commentaire.
 *
 * ## Pourquoi ce test plutôt qu'un lint
 *
 * Le défaut est invisible à `tsc`, à ESLint et à Prettier : c'est du texte dans un
 * commentaire, syntaxiquement irréprochable. Il ne se voit qu'au rendu — et le
 * message d'erreur pointe une ligne de CSS *généré* (`globals.css:4590`) alors que
 * le fichier source en fait 604, ce qui envoie chercher au mauvais endroit.
 *
 * ⚠️ Corollaire découvert le même jour : **corriger la source ne suffit pas**. Le
 * cache Turbopack conserve le CSS fautif ; il faut purger `.next`.
 *
 * ## La règle
 *
 * Écrire la classe en entier, ou ne pas l'écrire. Jamais d'abréviation par points
 * de suspension à l'intérieur des crochets d'une classe arbitraire.
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..", "..");

const SCANNED_DIRS = ["app", "modules", "shared"];
const SCANNED_EXTENSIONS = [".ts", ".tsx", ".css"];
const IGNORED_DIRS = new Set(["node_modules", ".next", "__snapshots__"]);

/**
 * Une classe arbitraire dont les crochets contiennent trois POINTS ASCII.
 *
 * Deux restrictions, chacune fondée sur une observation :
 *
 * 1. **Le préfixe utilitaire suivi de `[`** — c'est ce qui fait de la chaîne un
 *    candidat aux yeux de Tailwind. Une ellipse dans une phrase (« le
 *    `max(…, env(…))` ne couvre que… »), fréquente et légitime dans les
 *    commentaires du dépôt, n'en est pas un.
 * 2. **Points ASCII uniquement, pas `…` (U+2026).** Un identifiant CSS accepte les
 *    caractères non-ASCII : `animation: …` parse, `padding-bottom: max(0px,
 *    env(...))` non. Le dépôt contient plusieurs `drop-shadow-[…]` et
 *    `animate-[…]` en commentaire et compile très bien — les signaler ferait de ce
 *    test un cri au loup, et un test qui crie au loup finit désactivé.
 *
 * On ne verrouille donc que ce qui est PROUVÉ nuisible.
 */
const ABBREVIATED_ARBITRARY_CLASS = /\b[a-z][a-z0-9-]*-\[[^\]\s]*\.\.\.[^\]\s]*\]/g;

function collectFiles(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (IGNORED_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			collectFiles(full, acc);
		} else if (SCANNED_EXTENSIONS.some((ext) => entry.endsWith(ext))) {
			acc.push(full);
		}
	}
	return acc;
}

describe("Tailwind — pas de classe arbitraire abrégée (@regression tailwind-arbitrary-class-ellipsis)", () => {
	it("aucune source ne contient de classe arbitraire abrégée par une ellipse", () => {
		const offenders: string[] = [];

		for (const dir of SCANNED_DIRS) {
			for (const file of collectFiles(join(ROOT, dir))) {
				const source = readFileSync(file, "utf8");
				const matches = source.match(ABBREVIATED_ARBITRARY_CLASS);
				if (!matches) continue;

				const relative = file.slice(ROOT.length + 1);
				for (const match of matches) {
					const line = source.slice(0, source.indexOf(match)).split("\n").length;
					offenders.push(`${relative}:${line} → ${match}`);
				}
			}
		}

		expect(
			offenders,
			"Tailwind v4 scanne aussi les commentaires : une classe arbitraire abrégée y " +
				"devient un candidat, génère une déclaration CSS invalide, et fait échouer le " +
				"parsing de TOUTE la feuille — chaque page du site répond alors 500.\n" +
				"Écrire la classe en entier, ou ne pas l'écrire.\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	/**
	 * Garde-fou du garde-fou : prouve que le motif attrape le cas réel et laisse
	 * passer les ellipses de prose, sinon l'assertion ci-dessus pourrait être
	 * vacuously true (ou insupportablement bruyante).
	 *
	 * ⚠️ Les exemples sont CONCATÉNÉS, jamais écrits en toutes lettres : Tailwind
	 * scanne aussi les fichiers de test, et un motif fautif littéral dans CE
	 * fichier casserait la feuille exactement comme le défaut qu'il verrouille.
	 */
	it("le motif distingue une classe abrégée d'une ellipse de prose", () => {
		const detect = (s: string) => s.match(ABBREVIATED_ARBITRARY_CLASS) ?? [];
		const dots = "." + "." + ".";
		const ell = "\u2026";

		// Le cas réel qui a mis tout le site en 500.
		const realCase = `pb-[max(0px,env(${dots}))]`;
		expect(detect(`// \`${realCase}\` … p-0! côte à côte.`)).toEqual([realCase]);

		expect(detect(`className={cn("w-[calc(100%-${dots})]")}`)).toHaveLength(1);

		// `…` typographique : identifiant CSS valide, donc inoffensif. Le dépôt en
		// contient plusieurs en commentaire et compile — ne pas les signaler.
		expect(detect(`un \`pb-[${ell}]\` en safe-area`)).toEqual([]);
		expect(detect(`className="drop-shadow-[${ell}]"`)).toEqual([]);

		// Prose légitime : l'ellipse n'est pas DANS les crochets d'une classe.
		expect(detect(`Le \`max(${ell}, env(${ell}))\` ne couvre plus que le cas SANS barre.`)).toEqual(
			[],
		);
		expect(detect("Trois points de suspension… puis la suite de la phrase.")).toEqual([]);

		// Classes arbitraires COMPLÈTES : jamais signalées.
		expect(detect('className="pb-[max(0px,env(safe-area-inset-bottom))]"')).toEqual([]);
		expect(detect('className="top-[var(--navbar-height-static)]"')).toEqual([]);
	});
});
