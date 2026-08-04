/**
 * @regression update-order-status-never-writes-payment
 *
 * `updateOrderStatus` a fusionné cinq actions de transition (2026-08-05). C'est
 * cette fusion qui rend l'assertion nécessaire : une action GÉNÉRIQUE, pilotée
 * par une clé venue du client, ne doit jamais pouvoir toucher à l'argent.
 *
 * L'invariant 8 (« pas de vente manuelle / pas de caisse », risque NF 525) est
 * gardé par `no-manual-paid-order.regression.test.ts`, dont l'allowlist raisonne
 * sur des FICHIERS : `mark-as-paid.ts` et le service webhook, et eux seuls,
 * peuvent écrire `paymentStatus: PAID`. Tant que les transitions vivaient dans
 * cinq fichiers distincts, la granularité SUFFISAIT à isoler l'argent.
 *
 * Elle ne suffit plus. `updateOrderStatus` est un seul fichier hors allowlist qui
 * exécute cinq chemins : il suffirait d'ajouter `paymentStatus` à la `data` d'une
 * config pour ouvrir un chemin monétaire sous un nom anodin — et le garde-fou
 * historique ne le verrait que si la valeur écrite était exactement `PAID`.
 *
 * Ce test ferme le trou : AUCUNE écriture de `paymentStatus`, quelle que soit la
 * valeur. Le `where` de la garde atomique, lui, a le droit de le LIRE (la
 * transition « processing » ré-asserte que la commande est payée) — c'est la
 * distinction que fait l'assertion.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const ACTION_PATH = join(__dirname, "..", "update-order-status.ts");
const source = readFileSync(ACTION_PATH, "utf-8");

/**
 * Extrait le corps de chaque closure `data: (…) => ({ … })` de la table de
 * transitions — c'est-à-dire tout ce qui atteint le `data:` du `updateMany`.
 */
function extractDataClosures(code: string): string[] {
	const bodies: string[] = [];
	const re = /\bdata:\s*\([^)]*\)\s*=>\s*\(\{/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(code)) !== null) {
		let depth = 1;
		let i = m.index + m[0].length;
		const start = i;
		while (i < code.length && depth > 0) {
			if (code[i] === "{") depth += 1;
			else if (code[i] === "}") depth -= 1;
			i += 1;
		}
		bodies.push(code.slice(start, i - 1));
	}
	return bodies;
}

describe("@regression update-order-status-never-writes-payment", () => {
	it("le détecteur trouve bien les closures `data` (garde-fou du garde-fou)", () => {
		// Sans ce plancher, une closure renommée rendrait la suite vacuellement verte.
		expect(extractDataClosures(source).length).toBeGreaterThanOrEqual(5);
	});

	it("aucune closure `data` n'écrit `paymentStatus`", () => {
		const offenders = extractDataClosures(source).filter((body) => /paymentStatus/.test(body));
		expect(
			offenders,
			`Une transition écrit paymentStatus — chemin monétaire interdit dans l'action générique (invariant 8, NF 525). ` +
				`L'argent passe par mark-as-paid.ts / mark-as-fully-refunded.ts / cancel-order.ts, qui sont des fichiers dédiés.\n` +
				offenders.join("\n---\n"),
		).toEqual([]);
	});

	it("le type des écritures n'expose pas `paymentStatus`", () => {
		// Ceinture ET bretelles : `TransitionData` borne ce qu'une config PEUT écrire.
		// Si quelqu'un l'élargit, l'assertion ci-dessus resterait verte tant qu'aucune
		// config ne s'en sert — c'est le moment de le voir, pas après.
		const typeBlock = source.slice(
			source.indexOf("type TransitionData = {"),
			source.indexOf("interface TransitionConfig"),
		);
		expect(typeBlock.length).toBeGreaterThan(0);
		expect(typeBlock).not.toMatch(/paymentStatus/);
	});

	it("la garde atomique garde le DROIT de lire `paymentStatus`", () => {
		// L'inverse du test précédent : la transition « processing » ré-asserte que
		// la commande est payée dans le `where`. Si cette lecture disparaissait, on
		// pourrait passer en préparation une commande impayée.
		expect(source).toMatch(/guard:\s*\{[\s\S]*?paymentStatus:\s*\[/);
	});
});
