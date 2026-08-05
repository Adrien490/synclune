/**
 * @regression collection-skeleton-parity
 *
 * Le squelette de `/collections` doit recouvrir le carnet qu'il annonce.
 *
 * Du temps de la grille « Planche-contact », grille et squelette portaient
 * chacun leur littéral de classes : corriger les paliers dans l'un laissait
 * l'autre dessiner une page différente pendant tout le chargement (audit
 * CollectionCard 2026-08-04). Le redesign « Le carnet des séries » (2026-08-05)
 * remplace la comparaison de littéraux par un contrat plus fort : la géométrie
 * interne des bandes est EXPORTÉE de `collection-chapter.tsx` (cf.
 * `SHARED_GEOMETRY_EXPORTS`, qui dit aussi QUI doit consommer quoi) et ses
 * consommateurs doivent la CONSOMMER — pas la recopier.
 *
 * ⚠️ Deux extensions du 2026-08-05, chacune sur un défaut mesuré :
 *
 * - le contrat ne couvrait que la géométrie du CADRE. Le chevauchement
 *   (`-ml-3 lg:-ml-4`) et la bande de tirages étaient, eux, RECOPIÉS entre
 *   chapitre et squelette — la dérive exacte que ce fichier prétend interdire,
 *   restée invisible faute d'être sous contrat ;
 * - les RÉSERVES VERTICALES de la colonne texte n'étaient pas couvertes du tout.
 *   Le squelette réservait 112px pour ~202px de réel (description sur 4 lignes
 *   annoncée sur une, trait dessiné non réservé, `gap-3` là où le réel a des
 *   marges) : ~90px de décalage par bande au swap du `<Suspense>`. Elles sont
 *   maintenant recalculées ici depuis les classes réelles — c'est ce qui empêche
 *   le contrat d'être tautologique. Le volet MESURÉ est dans
 *   `e2e/performance.spec.ts` (« page collections - CLS under 0.15 »).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const COMPONENTS_DIR = join(__dirname, "..");

/** Retire commentaires de bloc et de ligne avant toute extraction. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const CHAPTER = stripComments(
	readFileSync(join(COMPONENTS_DIR, "collection-chapter.tsx"), "utf-8"),
);
const CHAPTERS = stripComments(
	readFileSync(join(COMPONENTS_DIR, "collection-chapters.tsx"), "utf-8"),
);
const SKELETON = stripComments(
	readFileSync(join(COMPONENTS_DIR, "collection-chapters-skeleton.tsx"), "utf-8"),
);

/**
 * Chaque export de géométrie, et QUI doit le consommer. Une table plutôt qu'une
 * liste : `CHAPTER_STACK_CLASSES` est consommé par l'assembleur, pas par le
 * squelette seul, et l'ancienne boucle ne regardait que le squelette.
 */
const SHARED_GEOMETRY_EXPORTS = {
	CHAPTER_CONTAINER_CLASSES: ["skeleton"],
	CHAPTER_PRINT_FRAME_CLASSES: ["skeleton"],
	CHAPTER_PRINT_MEDIA_CLASSES: ["skeleton"],
	CHAPTER_PRINT_ROTATIONS: ["skeleton"],
	CHAPTER_PRINT_OVERLAP_CLASSES: ["skeleton"],
	CHAPTER_PRINT_STRIP_CLASSES: ["skeleton"],
	CHAPTER_TEXT_RESERVES: ["skeleton"],
	CHAPTER_STACK_CLASSES: ["skeleton", "chapters"],
} as const satisfies Record<string, readonly ("skeleton" | "chapters")[]>;

const CONSUMERS = {
	skeleton: { label: "collection-chapters-skeleton.tsx", source: SKELETON },
	chapters: { label: "collection-chapters.tsx", source: CHAPTERS },
} as const;

/** Les 5 réserves verticales de la colonne texte — toutes doivent être consommées. */
const TEXT_RESERVE_KEYS = ["eyebrow", "title", "underline", "description", "price"] as const;

describe("@regression collection-skeleton-parity", () => {
	it("la géométrie des bandes est exportée par le chapitre (SSOT)", () => {
		for (const name of Object.keys(SHARED_GEOMETRY_EXPORTS)) {
			expect(CHAPTER, `export const ${name} manquant dans collection-chapter.tsx`).toMatch(
				new RegExp(`export const ${name}`),
			);
		}
	});

	it("chaque consommateur CONSOMME la géométrie du chapitre au lieu de la recopier", () => {
		for (const [name, consumers] of Object.entries(SHARED_GEOMETRY_EXPORTS)) {
			for (const key of consumers) {
				const { label, source } = CONSUMERS[key];
				expect(
					source,
					`${name} n'est pas consommé par ${label} — la parité redevient une promesse`,
				).toContain(name);
			}
		}
		// Le squelette ne doit pas redéclarer son propre conteneur de bande : un
		// second littéral `max-w-6xl … grid` hors import est le début de la dérive.
		const skeletonLiterals = [...SKELETON.matchAll(/"([^"]*max-w-6xl[^"]*)"/g)].map((m) => m[1]!);
		for (const literal of skeletonLiterals) {
			expect(
				literal.includes("grid-cols"),
				`littéral de conteneur de bande dupliqué dans le squelette : "${literal}"`,
			).toBe(false);
		}
	});

	it("le squelette ne réserve PAS la bande de pagination (et l'assembleur la rend dans le conteneur standard)", () => {
		// Depuis la bande « fin de l'étal » (audit cursor-pagination 2026-08-05),
		// le squelette ne dessine plus la pagination : il ne peut pas savoir si la
		// liste dépassera une page (la bande ne se rend qu'à cette condition), et
		// elle vit sous le pli — aucun décalage VISIBLE au swap. La parité ici est
		// donc une ABSENCE des deux côtés du littéral d'antan, plus un conteneur
		// standard côté assembleur.
		expect(CHAPTERS).toContain('className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"');
		expect(CHAPTERS).toContain("StorefrontPaginationBand");
		expect(SKELETON).not.toContain("Pagination");
		expect(SKELETON).not.toContain("justify-end");
	});

	it("le chevauchement et la bande de tirages ne sont plus des littéraux recopiés", () => {
		// Ces deux-là étaient dupliqués entre chapitre et squelette (et le second
		// deux fois dans le chapitre, une par branche) — la dérive exacte que ce
		// fichier prétend interdire, restée invisible parce que seule la géométrie
		// du CADRE était sous contrat.
		const literals = (source: string) => [...source.matchAll(/"([^"]*)"/g)].map((m) => m[1]!);

		// `justify-start` et non `justify-end` comme marqueur de la bande de tirages :
		// le conteneur de pagination porte légitimement un `justify-end`.
		for (const pattern of [/-ml-/, /justify-start/]) {
			expect(
				literals(SKELETON).filter((l) => pattern.test(l)),
				`littéral ${pattern} dans le squelette : il doit venir du chapitre`,
			).toEqual([]);
			expect(
				literals(CHAPTER).filter((l) => pattern.test(l)),
				`littéral ${pattern} dupliqué dans le chapitre`,
			).toHaveLength(1);
		}
	});

	it("le squelette consomme les CINQ réserves verticales", () => {
		for (const key of TEXT_RESERVE_KEYS) {
			expect(
				SKELETON,
				`CHAPTER_TEXT_RESERVES.${key} n'est pas consommé — cette ligne n'est pas réservée`,
			).toContain(`CHAPTER_TEXT_RESERVES.${key}`);
		}
	});

	/**
	 * Le cœur du contrat, et ce qui l'empêche d'être tautologique : les réserves
	 * sont recalculées depuis les classes RÉELLES. Changer `leading-[1.1]` ou
	 * passer la description en `text-base` sans toucher aux réserves échoue ici.
	 */
	it("les réserves valent le produit font-size × line-height de l'élément réel", () => {
		const reserves = /CHAPTER_TEXT_RESERVES\s*=\s*\{([\s\S]*?)\n\} as const/.exec(CHAPTER)?.[1];
		expect(reserves, "bloc CHAPTER_TEXT_RESERVES introuvable").toBeDefined();
		const reserve = (key: string) =>
			new RegExp(`\\b${key}:\\s*"([^"]*)"`).exec(reserves!)?.[1] ?? "";

		// --- Titre : les 3 paliers de `text-[…rem]` × `leading-[…]` du heading.
		const titleClass = /className="(font-display[^"]*)"/.exec(CHAPTER)?.[1] ?? "";
		const leading = Number(/leading-\[([\d.]+)\]/.exec(titleClass)?.[1]);
		const sizes = {
			"": Number(/(?:^|\s)text-\[([\d.]+)rem\]/.exec(titleClass)?.[1]),
			"sm:": Number(/\bsm:text-\[([\d.]+)rem\]/.exec(titleClass)?.[1]),
			"lg:": Number(/\blg:text-\[([\d.]+)rem\]/.exec(titleClass)?.[1]),
		};
		expect(leading, "leading-[…] du titre illisible").toBeGreaterThan(0);
		const titleReserve = reserve("title");
		for (const [prefix, size] of Object.entries(sizes)) {
			expect(size, `text-[…rem] ${prefix || "base"} du titre illisible`).toBeGreaterThan(0);
			// Number() retire les zéros de queue — c'est bien la forme qu'écrit Tailwind.
			const expected = `${prefix}h-[${Number((size * leading).toFixed(5))}rem]`;
			expect(titleReserve, `réserve du titre au palier « ${prefix || "base"} »`).toContain(
				expected,
			);
		}

		// --- Description : DEUX lignes réservées, `line-clamp-3` bornant le haut.
		// `text-sm` = 0.875rem et `leading-relaxed` = 1.625 sont les défauts Tailwind
		// v4 (aucun override dans app/globals.css) — le palier `sm` est lu au source.
		const descriptionClass =
			/CHAPTER_TEXT_RESERVES\.description,\s*"([^"]*)"/.exec(CHAPTER)?.[1] ?? "";
		expect(descriptionClass).toContain("text-sm");
		expect(descriptionClass).toContain("leading-relaxed");
		expect(descriptionClass).toContain("line-clamp-3");
		const descriptionSm = Number(/\bsm:text-\[([\d.]+)rem\]/.exec(descriptionClass)?.[1]);
		expect(descriptionSm, "sm:text-[…rem] de la description illisible").toBeGreaterThan(0);

		const descriptionReserve = reserve("description");
		const twoLines = (rem: number) => Number((2 * rem * 1.625).toFixed(6));
		expect(descriptionReserve).toContain(`min-h-[${twoLines(0.875)}rem]`);
		expect(descriptionReserve).toContain(`sm:min-h-[${twoLines(descriptionSm)}rem]`);

		// --- Eyebrow et prix : les line-heights des jetons `text-2xs` (0.875rem) et
		// `text-sm` (1.25rem) de app/globals.css. Épinglés, faute d'un parseur de
		// tokens ici — mais nommés, pour que le lien se voie.
		expect(reserve("eyebrow")).toContain("h-3.5"); // 0.875rem
		expect(reserve("price")).toContain("h-5"); // 1.25rem
		// --- Trait : la boîte NATIVE du viewBox 120 × 20 de HandDrawnAccent.
		expect(reserve("underline")).toContain("h-5"); // 20px
		expect(reserve("underline")).toContain("w-30"); // 120px
	});

	it("les marges de chaque réserve sont bien celles de l'élément réel", () => {
		// `mt-3` (description) et `mt-2.5` (prix) voyagent DANS la réserve, donc
		// partagés par construction ; restent les deux éléments qui n'en consomment
		// pas : le lien du titre et le trait.
		const linkClass = /className="(focus-ring[^"]*)"/.exec(CHAPTER)?.[1] ?? "";
		expect(linkClass, "le lien du titre doit porter le mt-2 de la réserve").toContain("mt-2");

		const underlineCall = /<HandDrawnUnderline\b[^>]*>/.exec(CHAPTER)?.[0] ?? "";
		expect(underlineCall).toContain("-mt-1");
		expect(underlineCall).toContain("-mb-1");
	});

	it("aucun retour de la grille en colonnes : pas de grid-cols-N avec N ≥ 3", () => {
		// Le carnet est un EMPILEMENT : la seule grille est celle interne à la
		// bande (1 colonne, puis `[minmax(0,1fr)_auto]` dès `sm`). Un
		// `md:grid-cols-3` réapparaissant ici serait la grille de cartes qui
		// revient sans son arbitrage.
		for (const [label, source] of [
			["collection-chapter.tsx", CHAPTER],
			["collection-chapters.tsx", CHAPTERS],
			["collection-chapters-skeleton.tsx", SKELETON],
		] as const) {
			const columnCounts = [...source.matchAll(/grid-cols-(\d+)/g)].map((m) => Number(m[1]));
			const max = columnCounts.length > 0 ? Math.max(...columnCounts) : 0;
			expect(max, `${label} : grille de ${max} colonnes détectée`).toBeLessThanOrEqual(1);
		}
	});
});
