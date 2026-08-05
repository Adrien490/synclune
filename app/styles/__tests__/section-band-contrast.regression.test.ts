/**
 * @regression section-band-contrast
 *
 * `--section-band` doit se VOIR, sans jamais mettre en danger l'encre posée dessus.
 *
 * ## Pourquoi ce test existe
 *
 * La prémisse du redesign « Le carnet des séries » (`/collections`, 2026-08-05) est
 * que chaque série possède sa couleur. Elle ne s'affichait pas : la bande portait
 * `--section-soft`, un accent à **5 %** d'alpha, soit ΔE OKLab ≈ 0,008 sur
 * `--background` — sous le seuil de perception pour deux grandes zones adjacentes.
 * Rien ne le signalait : aucun outil du dépôt ne mesure « est-ce que ça se voit ».
 *
 * Second défaut, plus sournois : à alpha ÉGAL les quatre accents ne pèsent pas
 * pareil (0,008 pour le rose contre 0,014 pour la lavande — un facteur 1,7 pour
 * une même intention). Les alphas de `--section-band` sont donc volontairement
 * inégaux, normalisés en ΔE. C'est cette normalisation que le test verrouille : un
 * futur « harmonisons à 15 % partout » la défait sans changer une seule valeur de
 * couleur.
 *
 * ## Ce qu'il vérifie
 *
 * 1. Le ΔE de chaque bande contre `--background` tient dans une fourchette — la
 *    borne BASSE interdit le retour à l'invisible, la HAUTE interdit la dérive vers
 *    l'aplat (`--muted` vaut 0,050 et lit déjà comme un panneau, pas une salle).
 * 2. `--muted-foreground` et `--foreground` gardent leur contraste AA sur les quatre
 *    surfaces composées. Le contrat de `catalog-accents.constants.ts` (« ces aplats
 *    ne portent aucun texte ») vise l'accent PUR ; il faut le prouver aux alphas
 *    retenus, pas le supposer.
 * 3. Que le mélange se fait bien en OKLab et vers `--background` (opaque) — deux
 *    bandes empilées ne doivent pas pouvoir s'additionner.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
	contrastRatio,
	deltaEOk,
	mixOklab,
	oklabToOklch,
	oklchToLinearSrgb,
	oklchToOklab,
	readOklch,
	type Oklab,
} from "@/test/utils/oklch";

const ACCENTS_CSS = readFileSync(join(__dirname, "..", "section-accents.css"), "utf8");

/**
 * Fourchette de ΔE OKLab visée contre `--background`.
 *
 * Bornes choisies sur les repères du système, pas à l'œil : `--card` vaut 0,011
 * (invisible) et `--muted` 0,050 (un panneau). Une bande est entre les deux.
 */
const DELTA_E_RANGE = { min: 0.025, max: 0.04 } as const;

/** Seuils de contraste sur la surface composée. AA texte normal = 4,5:1. */
const MIN_CONTRAST = { mutedForeground: 6.5, foreground: 17 } as const;

const ACCENT_NAMES = ["rose", "lavender", "mint", "sun"] as const;

/** Le bloc `[data-accent="<name>"] { … }` de `section-accents.css`. */
function accentBlock(name: string): string {
	const block = new RegExp(`\\[data-accent="${name}"\\]\\s*\\{([^}]*)\\}`).exec(ACCENTS_CSS)?.[1];
	if (!block) throw new Error(`Bloc [data-accent="${name}"] introuvable`);
	return block;
}

/**
 * Résout `--section-band` en OKLab, en suivant la déclaration RÉELLE : le jeton
 * d'accent visé, le pourcentage, et la couleur de fond du mélange. Rien n'est
 * recopié ici — un changement de pourcentage change la mesure.
 */
function readBand(name: string): { mixed: Oklab; percent: number; base: string } {
	const block = accentBlock(name);

	const accentVar = /--section-accent:\s*var\((--[\w-]+)\)/.exec(block)?.[1];
	if (!accentVar) throw new Error(`--section-accent non résolu pour « ${name} »`);

	const band =
		/--section-band:\s*color-mix\(\s*in oklab,\s*var\(--section-accent\)\s*([\d.]+)%,\s*var\((--[\w-]+)\)\s*\)/.exec(
			block,
		);
	if (!band) throw new Error(`--section-band absent ou non conforme pour « ${name} »`);

	const percent = Number(band[1]);
	const base = band[2]!;
	const mixed = mixOklab(
		oklchToOklab(readOklch(accentVar)),
		oklchToOklab(readOklch(base)),
		percent / 100,
	);
	return { mixed, percent, base };
}

const linear = (lab: Oklab) => oklchToLinearSrgb(...oklabToOklch(lab));
const contrastOn = (lab: Oklab, token: string) =>
	contrastRatio(linear(lab), oklchToLinearSrgb(...readOklch(token)));

describe("@regression section-band-contrast", () => {
	it("étalonne le mélange OKLab — 0 % et 100 % sont les extrémités exactes", () => {
		// Garde-fou du garde-fou : sans lui, une erreur de sens du ratio rendrait
		// tous les seuils ci-dessous silencieusement faux.
		const accent = oklchToOklab(readOklch("--primary"));
		const background = oklchToOklab(readOklch("--background"));
		expect(deltaEOk(mixOklab(accent, background, 0), background)).toBeCloseTo(0, 6);
		expect(deltaEOk(mixOklab(accent, background, 1), accent)).toBeCloseTo(0, 6);
	});

	it("attrape le défaut d'origine : le voile à 5 % est SOUS la borne basse", () => {
		// C'est la preuve que la borne basse mord. `--section-soft` valait 5 % —
		// si cette assertion tombe, la fourchette ne protège plus de rien.
		const invisible = mixOklab(
			oklchToOklab(readOklch("--primary")),
			oklchToOklab(readOklch("--background")),
			0.05,
		);
		expect(deltaEOk(invisible, oklchToOklab(readOklch("--background")))).toBeLessThan(
			DELTA_E_RANGE.min,
		);
	});

	it.each(ACCENT_NAMES)("« %s » : la bande se voit, sans devenir un aplat", (name) => {
		const { mixed } = readBand(name);
		const delta = deltaEOk(mixed, oklchToOklab(readOklch("--background")));
		expect(delta, `ΔE de la bande « ${name} » = ${delta.toFixed(4)}`).toBeGreaterThanOrEqual(
			DELTA_E_RANGE.min,
		);
		expect(delta, `ΔE de la bande « ${name} » = ${delta.toFixed(4)}`).toBeLessThanOrEqual(
			DELTA_E_RANGE.max,
		);
	});

	it.each(ACCENT_NAMES)("« %s » : l'encre tient sur la bande", (name) => {
		const { mixed } = readBand(name);
		expect(contrastOn(mixed, "--muted-foreground")).toBeGreaterThanOrEqual(
			MIN_CONTRAST.mutedForeground,
		);
		expect(contrastOn(mixed, "--foreground")).toBeGreaterThanOrEqual(MIN_CONTRAST.foreground);
	});

	it("les quatre alphas restent INÉGAUX — c'est la normalisation en ΔE", () => {
		// Un « harmonisons à N % partout » défait la normalisation sans toucher à
		// une seule couleur : à alpha égal la lavande pèse 1,7× le rose.
		const percents = ACCENT_NAMES.map((name) => readBand(name).percent);
		expect(new Set(percents).size, `alphas : ${percents.join(", ")}`).toBeGreaterThan(1);
	});

	it("la bande est OPAQUE : le mélange va vers --background, jamais vers transparent", () => {
		// Sinon deux bandes empilées s'additionnent, et les valeurs mesurées
		// ci-dessus ne sont plus celles rendues.
		for (const name of ACCENT_NAMES) {
			expect(readBand(name).base, `bande « ${name} »`).toBe("--background");
			expect(accentBlock(name)).not.toMatch(/--section-band:[^;]*transparent/);
		}
	});
});
