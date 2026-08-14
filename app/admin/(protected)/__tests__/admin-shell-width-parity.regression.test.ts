/**
 * @regression admin-shell-width-parity
 *
 * Le `<main>` de l'admin et son squelette de streaming (`AdminContentSkeleton`)
 * doivent porter **exactement** les mêmes classes de gabarit : plafond de
 * largeur, padding horizontal, paddings verticaux. Le squelette est rendu à la
 * place du `<main>` pendant la résolution des données ; toute divergence produit
 * un saut de mise en page au moment du swap.
 *
 * Le plafond `max-w-[100rem]` (1600px) a été ajouté à l'audit responsive
 * 2026-07-26 (P2) : sans lui, les tables denses et les grilles KPI
 * `lg:grid-cols-4` s'étiraient sur toute la largeur en 1920px+, et les notes /
 * descriptions libres perdaient toute borne de longueur de ligne. Il est posé
 * **sans `mx-auto`** — le contenu reste collé à la sidebar ; le centrer ferait
 * varier la gouttière gauche avec la largeur de fenêtre.
 *
 * Ce test lit la source plutôt que de rendre le layout : celui-ci est un Server
 * Component `async` qui appelle `requireAdminWithUser()` et Prisma.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const LAYOUT = readFileSync(join(__dirname, "..", "layout.tsx"), "utf-8");

/** Extrait les classes du `className="…"` d'une ligne contenant `marker`. */
function classesOfLineContaining(marker: string): string[] {
	const line = LAYOUT.split("\n").find((l) => l.includes(marker));
	if (!line) throw new Error(`Aucune ligne ne contient ${marker}`);
	const match = /className="([^"]+)"/.exec(line);
	if (!match?.[1]) throw new Error(`Pas de className sur la ligne contenant ${marker}`);
	return match[1].split(/\s+/).filter(Boolean);
}

/** Classes de gabarit — celles qui doivent être identiques des deux côtés. */
function layoutClasses(classes: string[]): string[] {
	return classes.filter((c) => /^(max-w-|px-|pt-|pb-|md:pt-|md:pb-|space-y-)/.test(c)).sort();
}

describe("@regression admin-shell-width-parity", () => {
	// Les deux éléments portent le même padding horizontal via `--admin-main-x`,
	// ce qui les rend identifiables sans dépendre de leur ordre dans le fichier.
	const occurrences = LAYOUT.split("\n").filter((l) =>
		l.includes('className="max-w-[100rem] space-y-6 px-[var(--admin-main-x)]'),
	);

	it("le main et le squelette de streaming existent tous les deux", () => {
		expect(
			occurrences.length,
			"attendu 2 conteneurs de gabarit admin (main + AdminContentSkeleton)",
		).toBe(2);
	});

	it("main et squelette partagent le même gabarit (plafond, paddings)", () => {
		const [first, second] = occurrences.map((line) => {
			const match = /className="([^"]+)"/.exec(line);
			return layoutClasses((match?.[1] ?? "").split(/\s+/).filter(Boolean));
		});

		expect(
			second,
			"divergence de gabarit main ↔ squelette : saut de mise en page au streaming",
		).toEqual(first);
	});

	it("plafonne la largeur du contenu admin", () => {
		const main = classesOfLineContaining("focus:outline-none");
		expect(main, "plafond de largeur admin retiré").toContain("max-w-[100rem]");
	});

	it("ne centre pas le contenu admin (gouttière gauche stable)", () => {
		for (const line of occurrences) {
			expect(
				line,
				"`mx-auto` sur le gabarit admin : la gouttière gauche varierait avec la largeur de fenêtre",
			).not.toMatch(/\bmx-auto\b/);
		}
	});

	/**
	 * Invariant symétrique de la parité ci-dessus, ajouté par l'audit « Système de
	 * feedback ».
	 *
	 * La parité stricte ne vaut que pour le squelette qui REMPLACE le `<main>`
	 * (`AdminContentSkeleton`, monté par `AdminLayoutSkeleton`). Le `<Suspense>` des
	 * children est, lui, À L'INTÉRIEUR du `<main>` : y rendre un squelette porteur du
	 * même gabarit doublait la gouttière horizontale (48 px au lieu de 24) et les
	 * paddings verticaux pendant tout le fallback de streaming.
	 *
	 * D'où deux composants aux contraintes opposées. Ce test empêche de les
	 * refusionner « pour éviter la duplication » — ce qui réintroduirait l'un des
	 * deux bugs selon le côté choisi.
	 */
	it("le squelette de streaming imbriqué ne porte AUCUN gabarit", () => {
		const streamingFallback = LAYOUT.split("\n").find((l) =>
			l.includes("<Suspense fallback={<AdminStreamingSkeleton />}>"),
		);
		expect(
			streamingFallback,
			"le fallback du <Suspense> des children doit être `AdminStreamingSkeleton` (sans gabarit), pas `AdminContentSkeleton`",
		).toBeDefined();

		// Le corps d'`AdminStreamingSkeleton` ne doit poser que `space-y-6`.
		const bodyStart = LAYOUT.indexOf("function AdminStreamingSkeleton()");
		expect(bodyStart, "`AdminStreamingSkeleton` introuvable").toBeGreaterThan(-1);
		const body = LAYOUT.slice(bodyStart, bodyStart + 600);

		expect(body, "gabarit posé sur le squelette imbriqué → padding doublé").not.toMatch(
			/max-w-\[100rem\]|px-\[var\(--admin-main-x\)\]/,
		);
	});
});
