/**
 * @regression amount-font-weight
 *
 * Un **montant** ne se rend jamais en `font-bold`, et la graisse qu'il porte
 * dépend de son RÔLE, pas du fichier où il se trouve :
 *
 * | Rôle                                                | Graisse         |
 * | --------------------------------------------------- | --------------- |
 * | Total à payer / total commande (récap client)       | `font-semibold` |
 * | Ligne d'article, sous-total, prix unitaire, ligne   | `font-medium`   |
 * | de table admin                                       |                 |
 * | (n'importe quel montant)                             | **jamais** `font-bold` |
 *
 * Audit typographique 2026-08-05 — le même rôle sémantique portait deux graisses
 * différentes sur deux surfaces que la cliente voit à la SUITE (récap de paiement
 * puis page de suivi de commande) : le total était `font-semibold` dans
 * `checkout-summary` et `font-bold` dans `order-summary-card` ; la ligne d'article
 * était `font-medium` dans `checkout-summary` et `font-semibold` dans
 * `order-items-list`. Au total un montant se rendait sous **quatre** graisses selon
 * le fichier, sans règle écrite nulle part.
 *
 * La règle n'est pas inventée : elle est DÉRIVÉE des deux surfaces les plus
 * travaillées du tunnel (`checkout-summary.tsx` et `/paiement/confirmation`), qui
 * étaient déjà d'accord entre elles. Les huit sites divergents ont été alignés
 * dessus.
 *
 * ## Ce que ce test verrouille — et ce qu'il ne peut PAS verrouiller
 *
 * Il verrouille l'invariant DUR : aucun `font-bold` sur un montant. `font-bold`
 * reste légitime ailleurs (pastilles de compteur en `text-2xs`, chiffres « 404 »
 * décoratifs) — c'est sur un montant qu'il casse l'échelle, parce qu'il ne reste
 * plus de cran au-dessus pour distinguer le total de sa ligne.
 *
 * Il ne peut PAS déduire le rôle d'un montant depuis son expression. `order.total`
 * est bien « un total », mais dans une LIGNE de table admin c'est le montant d'une
 * ligne parmi vingt : le rendre `font-semibold` mettrait toute la colonne en
 * relief. Une première version de ce test l'a assumé et signalait à tort
 * `orders-data-table`, `orders-mobile-list-item` et `recent-orders-list`. Le
 * versant `font-semibold` est donc épinglé sur une LISTE EXPLICITE de récaps
 * client — à étendre quand une nouvelle surface de total apparaît, jamais à
 * généraliser par motif.
 *
 * ## Portée : Tailwind seulement
 *
 * `emails/` est hors périmètre. Les templates React Email n'ont pas de classes
 * utilitaires : ils portent des `style={{ fontWeight: "bold" }}` inline, sur une
 * échelle typographique à eux (monospace, `EMAIL_COLORS`) contrainte par les
 * clients de messagerie. Y appliquer l'échelle du site n'aurait pas de sens.
 *
 * ## Comment la graisse d'un montant est attribuée
 *
 * La graisse est rarement sur la même ligne que le montant, et pas toujours sur
 * son propre élément : sur `/paiement/confirmation` c'est la RANGÉE qui porte
 * `font-semibold`, le `<dd>` du montant n'a que `tabular-nums`. On remonte donc
 * les lignes depuis le montant et on retient la première graisse rencontrée.
 *
 * ⚠️ Une simple fenêtre de N lignes ne suffit PAS, et c'est le piège qui a rendu
 * le premier jet de ce test faux-négatif : juste au-dessus du montant se trouve
 * son LABEL (`<span className="font-semibold">Total</span>`), dont la graisse
 * n'a rien à voir avec celle du montant. Dégrader le total en `font-medium`
 * passait alors inaperçu. La remontée ignore donc les lignes AUTO-CONTENUES
 * (celles qui ouvrent et referment leur balise) : ce sont des frères, jamais des
 * ancêtres. Seule une ligne qui ouvre sans refermer peut englober le montant.
 *
 * Les montants interpolés dans un gabarit (`aria-label`, message `aria-live`)
 * sont ignorés : ils n'ont pas d'élément porteur.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
/** `emails/` volontairement absent — cf. § Portée du JSDoc. */
const SCAN_DIRS = ["app", "modules", "shared"] as const;
const SKIP_DIRS = new Set(["node_modules", ".next", "generated", "__tests__", "__snapshots__"]);

/** Rendu d'un montant en euros — la SSOT de formatage du projet. */
const AMOUNT_CALL = "formatEuro(";

/** Lignes remontées au maximum pour trouver l'ancêtre qui porte la graisse. */
const LOOKBACK = 6;

interface TotalSite {
	/** Chemin relatif au repo. */
	file: string;
	/** Expression exacte du montant, telle qu'écrite dans le JSX. */
	expression: string;
	/** Nombre d'occurrences JSX attendues — ancre le test à la réalité du fichier. */
	occurrences: number;
	/** Surface concernée, sert de message d'erreur. */
	surface: string;
}

/**
 * Récaps CLIENT où le montant est le total à payer. Liste explicite : le rôle
 * n'est pas déductible de l'expression (cf. JSDoc).
 */
const TOTAL_SITES: readonly TotalSite[] = [
	{
		file: "modules/payments/components/checkout-summary.tsx",
		expression: "formatEuro(total)",
		occurrences: 2, // récap desktop + barre repliable mobile
		surface: "récapitulatif du tunnel de paiement",
	},
	{
		file: "app/paiement/confirmation/page.tsx",
		expression: "formatEuro(order.total)",
		occurrences: 1,
		surface: "page de confirmation de paiement",
	},
	{
		file: "modules/orders/components/customer/order-summary-card.tsx",
		expression: "formatEuro(order.total)",
		occurrences: 1,
		surface: "carte de récapitulatif du suivi de commande",
	},
];

function walk(dir: string, out: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) walk(full, out);
		else if (entry.endsWith(".tsx")) out.push(full);
	}
	return out;
}

/**
 * Neutralise les commentaires SANS changer le nombre de lignes — sinon les
 * numéros rapportés désignent la mauvaise ligne (le premier jet de ce test
 * pointait `recent-orders-list.tsx:189` pour un montant écrit ligne 192).
 */
function stripComments(source: string): string {
	return source
		.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, (match) => "\n".repeat((match.match(/\n/g) ?? []).length))
		.replace(/^[ \t]*\/\/.*$/gm, "");
}

/** Un montant interpolé dans un gabarit n'a pas d'élément porteur. */
function isInterpolated(line: string): boolean {
	return line.includes("${");
}

function readLines(file: string): string[] {
	return stripComments(readFileSync(join(REPO_ROOT, file), "utf8")).split("\n");
}

function sourceFiles(): { path: string; lines: string[] }[] {
	const files: { path: string; lines: string[] }[] = [];
	for (const dir of SCAN_DIRS) {
		for (const full of walk(join(REPO_ROOT, dir))) {
			const rel = relative(REPO_ROOT, full).split(sep).join("/");
			files.push({ path: rel, lines: readLines(rel) });
		}
	}
	return files;
}

/**
 * Une ligne qui ouvre ET referme sa balise est un FRÈRE du montant, pas un
 * ancêtre : sa graisse ne s'applique pas au montant. C'est le cas du label
 * `<span className="font-semibold">Total</span>` posé juste au-dessus.
 */
function isSelfContained(line: string): boolean {
	return /<[A-Za-z]/.test(line) && (line.includes("</") || /\/>/.test(line));
}

const WEIGHT = /font-(normal|medium|semibold|bold)/;

/**
 * Graisse effective d'un montant : la première rencontrée en remontant depuis sa
 * ligne, frères sautés. `null` si aucune n'apparaît dans la portée — le montant
 * hérite alors d'un ancêtre plus lointain, hors de portée d'un scan statique.
 */
function weightForAmount(lines: string[], index: number): string | null {
	for (let i = index; i >= 0 && index - i <= LOOKBACK; i--) {
		const line = lines[i];
		if (line === undefined) continue;
		if (i !== index && isSelfContained(line)) continue;
		const match = line.match(WEIGHT);
		if (match) return match[0];
	}
	return null;
}

describe("graisse typographique des montants", () => {
	it("ne rend AUCUN montant en font-bold", () => {
		const offenders: string[] = [];
		let scanned = 0;

		for (const { path, lines } of sourceFiles()) {
			lines.forEach((line, i) => {
				if (!line.includes(AMOUNT_CALL) || isInterpolated(line)) return;
				scanned += 1;
				if (weightForAmount(lines, i) === "font-bold") offenders.push(`${path}:${i + 1}`);
			});
		}

		// Garde-fou du garde-fou : si `formatEuro` était renommé, le scan
		// resterait vert sans rien vérifier.
		expect(scanned, "aucun montant trouvé — le scan ne vérifie plus rien").toBeGreaterThan(20);
		expect(
			offenders,
			"Un montant en `font-bold` casse l'échelle : il ne reste plus de cran " +
				"au-dessus pour distinguer le total de sa ligne. Total = `font-semibold`, " +
				"ligne = `font-medium` (cf. CLAUDE.md § Graisse des montants).\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it.each(TOTAL_SITES)("rend le total en font-semibold — $surface", (site) => {
		const lines = readLines(site.file);
		const hits = lines
			.map((line, i) => ({ line, i }))
			.filter(({ line }) => line.includes(site.expression) && !isInterpolated(line));

		// Ancre : un déplacement du montant vers un autre fichier doit casser ici,
		// pas passer inaperçu.
		expect(
			hits.length,
			`${site.file} : ${hits.length} occurrence(s) JSX de \`${site.expression}\`, ` +
				`${site.occurrences} attendue(s) — mettre TOTAL_SITES à jour.`,
		).toBe(site.occurrences);

		for (const { i } of hits) {
			expect(
				weightForAmount(lines, i),
				`${site.file}:${i + 1} — le total à payer se rend en \`font-semibold\` ` +
					"(cf. CLAUDE.md § Graisse des montants).",
			).toBe("font-semibold");
		}
	});
});
