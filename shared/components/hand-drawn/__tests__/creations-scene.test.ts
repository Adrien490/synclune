import { describe, expect, it } from "vitest";

import { CREATION_SCENE, CREATION_SCENE_BOX } from "@/shared/components/hand-drawn/creations";
import { CREATION_PATHS } from "@/shared/components/hand-drawn/paths";
import { ogCreationsMark } from "@/shared/components/og/og-marks";

/**
 * Le présentoir — surveillance de la DONNÉE, plus du rendu.
 *
 * @description
 * Cette suite remplace la sous-suite géométrique d'`hero-creations.test.tsx`,
 * supprimée le 2026-08-07 avec le décor du premier écran (§ en bas de
 * `hero-heading.tsx` : un dessin de bijoux à côté de PHOTOS de bijoux). Le dessin,
 * lui, n'est pas mort — il est le sujet de la carte de partage
 * (`app/opengraph-image.tsx`), où il n'a aucune photo en face.
 *
 * ⚠️ **C'est ce déménagement qui rend cette suite nécessaire, et pas seulement
 * souhaitable.** Tant que la scène s'affichait sur `/`, une pièce décrochée finissait
 * par se voir. Elle ne se rend plus nulle part qu'à travers Satori, dans une image
 * que personne ne regarde au quotidien : une régression y serait silencieuse jusqu'au
 * jour où un lien est partagé.
 *
 * Ce qui est testé est donc ce qui ne survit pas à une relecture à l'œil :
 * l'ACCROCHE (des ordonnées mesurées sur une courbe), le REGISTRE DE MATIÈRE, et les
 * deux pièges qui ne préviennent pas — Satori qui ignore `var()`/`oklch()` en
 * silence, et le contrat `native` ⇔ `size` que `tsc` ne peut pas exprimer.
 */

type CordSegment = {
	p0: readonly [number, number];
	c: readonly [number, number];
	p1: readonly [number, number];
};

/**
 * Découpe `M x y (Q cx cy x y)+` en quadratiques successives.
 *
 * ⚠️ Le pas est de 4 : le `d` du cordon doit rester `M` + groupes `Q` à abscisse
 * strictement croissante (contrat écrit dans `paths.ts`). Un `T` ou un `C` s'y
 * débiterait en segments fantaisistes et « prouverait » n'importe quoi — d'où le
 * test de forme ci-dessous, avant toute mesure.
 */
function cordSegments(d: string): CordSegment[] {
	const nums = d.match(/-?[\d.]+/g)!.map(Number);
	const segments: CordSegment[] = [];
	let p0: readonly [number, number] = [nums[0]!, nums[1]!];

	for (let i = 2; i + 3 < nums.length; i += 4) {
		const p1 = [nums[i + 2]!, nums[i + 3]!] as const;
		segments.push({ p0, c: [nums[i]!, nums[i + 1]!] as const, p1 });
		p0 = p1;
	}

	return segments;
}

/** Ordonnée du cordon à une abscisse donnée — la quadratique RÉSOLUE, pas une table. */
function cordYAt(segments: CordSegment[], x: number): number {
	const segment = segments.find(({ p0, p1 }) => x >= p0[0] && x <= p1[0]);
	expect(segment, `l'abscisse ${x} doit tomber sur le cordon`).toBeDefined();

	const { p0, c, p1 } = segment!;
	// x(t) = a t² + b t + p0x — on cherche le t ∈ [0,1] qui rend l'abscisse voulue.
	const a = p0[0] - 2 * c[0] + p1[0];
	const b = 2 * (c[0] - p0[0]);
	const k = p0[0] - x;
	const roots =
		Math.abs(a) < 1e-9
			? [-k / b]
			: [
					(-b + Math.sqrt(b * b - 4 * a * k)) / (2 * a),
					(-b - Math.sqrt(b * b - 4 * a * k)) / (2 * a),
				];
	const t = roots.find((root) => root >= -1e-9 && root <= 1 + 1e-9)!;

	return (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t ** 2 * p1[1];
}

const SEGMENTS = cordSegments(CREATION_PATHS.cord.d);
const MARKS = CREATION_SCENE.flatMap((piece) => piece.marks.map((mark) => ({ piece, mark })));

describe("Le présentoir — la scène de la carte de partage", () => {
	it("garde les QUATRE créations réelles, de gauche à droite sur le cordon", () => {
		expect(CREATION_SCENE.map((piece) => piece.key)).toEqual([
			"arc-en-ciel",
			"raisin-vert",
			"nuit-etoilee",
			"raisin-orange",
		]);

		// L'ordre du tableau est l'ordre de PROFONDEUR : la rivière derrière tout,
		// puis gauche → droite. Les trois pièces suspendues sont donc à abscisse
		// croissante — une inversion mettrait la grappe verte devant le cabochon.
		const hung = CREATION_SCENE.filter((piece) => piece.key !== "arc-en-ciel");
		expect(hung.map((piece) => piece.x)).toEqual(
			[...hung.map((piece) => piece.x)].sort((a, b) => a - b),
		);
	});

	it("le cordon reste une suite de quadratiques à abscisse croissante — sans quoi rien ci-dessous ne prouve quoi que ce soit", () => {
		expect(CREATION_PATHS.cord.d).toMatch(/^M[\d.\s-]+(Q[\d.\s-]+)+$/);
		expect(SEGMENTS.length).toBeGreaterThan(0);

		for (const { p0, p1 } of SEGMENTS) {
			expect(p1[0]).toBeGreaterThan(p0[0]);
		}
	});

	it("chaque point d'accroche est SUR le cordon, seconds anneaux compris", () => {
		// Le défaut que ce test attrape : retoucher le cordon (ou une pièce) sans
		// reprendre l'ordonnée d'accroche. La pièce pend alors dans le vide, et
		// c'est invisible sur une image de 420 × 112 — a fortiori sur une carte OG
		// que personne ne regarde de près.
		const rings = CREATION_SCENE.flatMap((piece) =>
			piece.marks
				.filter((mark) => mark.slot === "ring")
				.map((mark) => ({
					key: piece.key,
					x: piece.x + (mark.x ?? 0),
					y: piece.y + (mark.y ?? 0),
				})),
		);

		// Six anneaux : un par pièce, plus les SECONDS points d'accroche du ruban de
		// velours et de la chaîne de la rivière — ce sont eux qui décrochent en
		// premier, parce qu'ils sont écrits en coordonnées RELATIVES.
		expect(rings).toHaveLength(6);

		for (const ring of rings) {
			expect(
				Math.abs(cordYAt(SEGMENTS, ring.x) - ring.y),
				`« ${ring.key} » décroché du cordon en x ${ring.x}`,
			).toBeLessThan(0.05);
		}
	});

	it("toutes les couleurs sont des HEX sRGB — Satori ignore var() et oklch() EN SILENCE", () => {
		const colors = MARKS.flatMap(({ mark }) =>
			[mark.inkColor, mark.fill].filter((value): value is string => Boolean(value)),
		);

		expect(colors.length).toBeGreaterThan(50);

		for (const color of colors) {
			expect(color).toMatch(/^#[0-9a-f]{6}$/i);
		}
	});

	it("toute trace déclare sa MATIÈRE : l'encre lavande de liaison ne peint plus que le cordon", () => {
		// `inkColor` absent = encre lavande de liaison, réservée au cordon et aux
		// fils. Le cordon n'est PAS dans la scène (il est tracé à part depuis
		// `CREATION_PATHS.cord`), et la scène compacte qui portait un fil est partie
		// le 2026-08-07 : plus aucune trace de bijou n'a le droit d'omettre sa
		// couleur, sans quoi on retombe sur le « tout dans le même aplat violet »
		// que l'audit de fidélité avait nommé.
		const lavender = MARKS.filter(({ mark }) => mark.ink && !mark.inkColor);
		expect(lavender.map(({ piece }) => piece.key)).toEqual([]);
	});

	it("tient le contrat native ⇔ size, et tout aplat déclare son opacité", () => {
		for (const { piece, mark } of MARKS) {
			// `size` convertit une boîte native en facteur d'échelle : sans boîte, il
			// ne veut rien dire ; avec une boîte, son absence rendrait la trace à sa
			// taille native. `tsc` ne sait pas exprimer cette dépendance.
			expect(Boolean(mark.native), `${piece.key} : native sans size (ou l'inverse)`).toBe(
				mark.size !== undefined,
			);

			if (mark.fill) {
				expect(mark.fillOpacity, `${piece.key} : aplat sans opacité déclarée`).toBeDefined();
			}
		}
	});

	it("seuls de PETITS reflets respirent — un présentoir dont tout scintille clignote", () => {
		const twinkling = MARKS.filter(({ mark }) => mark.twinkle);

		expect(twinkling).toHaveLength(3);

		for (const { piece, mark } of twinkling) {
			expect(
				mark.size!,
				`${piece.key} : ce n'est plus un reflet, c'est la pièce`,
			).toBeLessThanOrEqual(10);
		}
	});

	it("la carte OG sérialise la scène entière, sans un seul token de couleur", () => {
		// ⚠️ `ogCreationsMark()` rend une data-URI BASE64, pas du SVG : asserter
		// directement sur son retour donne un test vert pour la mauvaise raison
		// (aucune chaîne lisible n'y survit, « var( » pas plus qu'autre chose).
		// C'est arrivé à la première écriture de ce test, le 2026-08-07.
		const encoded = ogCreationsMark();
		expect(encoded.startsWith("data:image/svg+xml;base64,")).toBe(true);

		const svg = Buffer.from(encoded.split(",")[1]!, "base64").toString("utf8");
		expect(svg).toContain("<path");

		// Un `var(--…)` ou un `oklch()` serait ignoré par Satori sans la moindre
		// erreur, et la pièce sortirait NOIRE.
		expect(svg).not.toMatch(/var\(|oklch/);

		// La boîte est celle de la SCÈNE, jamais celle du cordon (32 de haut) : la
		// carte avait déjà rendu une scène coupée pour avoir recopié la mauvaise.
		expect(svg).toContain(`0 0 ${CREATION_SCENE_BOX.width} ${CREATION_SCENE_BOX.height}`);
	});
});
