import { describe, expect, it } from "vitest";

import { sortColorsByHue } from "../sort-colors-by-hue";

const slugs = (colors: Array<{ slug: string }>) => colors.map((c) => c.slug);

describe("sortColorsByHue", () => {
	it("rend une liste vide pour une entrée vide", () => {
		expect(sortColorsByHue([])).toEqual([]);
	});

	it("ne mute pas l'entrée", () => {
		const input = [
			{ slug: "citron", hex: "#F5CF3C" },
			{ slug: "framboise", hex: "#F0568F" },
		];
		const snapshot = slugs(input);

		sortColorsByHue(input);

		expect(slugs(input)).toEqual(snapshot);
	});

	// ─── L'arc chromatique ────────────────────────────────────────────────────

	it("ordonne les teintes franches le long de la roue", () => {
		const result = sortColorsByHue([
			{ slug: "lagon", hex: "#3BA8B8" },
			{ slug: "iris", hex: "#A06BC4" },
			{ slug: "mandarine", hex: "#F0932B" },
			{ slug: "fougere", hex: "#4FAE6F" },
			{ slug: "citron", hex: "#F5CF3C" },
		]);

		expect(slugs(result)).toEqual(["mandarine", "citron", "fougere", "lagon", "iris"]);
	});

	/**
	 * La roue démarre au rose de marque, pas au rouge : la première pastille du
	 * mur est celle de la boutique. Au rouge, le rose finirait DERNIER (337°/360).
	 */
	it("ouvre le nuancier sur le rose de marque, pas sur le rouge", () => {
		const result = sortColorsByHue([
			{ slug: "citron", hex: "#F5CF3C" },
			{ slug: "framboise", hex: "#F0568F" },
			{ slug: "fougere", hex: "#4FAE6F" },
		]);

		expect(slugs(result)[0]).toBe("framboise");
	});

	// ─── Les neutres ──────────────────────────────────────────────────────────

	it("rejette les quasi-neutres APRÈS toutes les teintes franches", () => {
		const result = sortColorsByHue([
			{ slug: "argent", hex: "#C0C0C0" },
			{ slug: "lagon", hex: "#3BA8B8" },
			{ slug: "noir", hex: "#1A1A1A" },
			{ slug: "framboise", hex: "#F0568F" },
		]);

		expect(slugs(result).slice(0, 2)).toEqual(["framboise", "lagon"]);
		expect(slugs(result).slice(2)).toEqual(["argent", "noir"]);
	});

	it("trie les neutres du plus clair au plus sombre", () => {
		const result = sortColorsByHue([
			{ slug: "noir", hex: "#1A1A1A" },
			{ slug: "or-blanc", hex: "#F5F5F5" },
			{ slug: "argent", hex: "#C0C0C0" },
		]);

		expect(slugs(result)).toEqual(["or-blanc", "argent", "noir"]);
	});

	/**
	 * Le cas réel de la base : quatre teintes quasi blanches dont l'angle de
	 * teinte est du bruit numérique (#F5F5F5 est à 0°, #FDEEF4 à 340°). Les
	 * ranger par teinte les éparpillerait ENTRE les couleurs franches — d'où le
	 * seuil de saturation.
	 */
	it("ne disperse pas quatre quasi-blanches parmi les teintes franches", () => {
		const result = sortColorsByHue([
			{ slug: "or-jaune", hex: "#FFD700" },
			{ slug: "or-rose", hex: "#E8B4B8" },
			{ slug: "or-blanc", hex: "#F5F5F5" },
			{ slug: "argent", hex: "#C0C0C0" },
			{ slug: "noir", hex: "#1A1A1A" },
			{ slug: "perle", hex: "#FDEEF4" },
			{ slug: "cristal", hex: "#E8F4F8" },
			{ slug: "emeraude", hex: "#50C878" },
		]);
		const ordered = slugs(result);
		const neutrals = ["or-blanc", "argent", "noir", "perle", "cristal"];

		// Chaque neutre vient après chaque couleur franche.
		const firstNeutral = Math.min(...neutrals.map((s) => ordered.indexOf(s)));
		const lastChromatic = Math.max(
			ordered.indexOf("or-jaune"),
			ordered.indexOf("emeraude"),
			ordered.indexOf("or-rose"),
		);

		expect(firstNeutral).toBeGreaterThan(lastChromatic);
		expect(ordered).toHaveLength(8);
	});

	// ─── Robustesse ───────────────────────────────────────────────────────────

	it("range un hex illisible avec les neutres plutôt que de le PERDRE", () => {
		const result = sortColorsByHue([
			{ slug: "framboise", hex: "#F0568F" },
			{ slug: "corrompue", hex: "pas-un-hex" },
		]);

		expect(slugs(result)).toEqual(["framboise", "corrompue"]);
	});

	it("accepte un hex court (3 chiffres)", () => {
		const result = sortColorsByHue([
			{ slug: "fougere", hex: "#4A6" },
			{ slug: "framboise", hex: "#F58" },
		]);

		expect(slugs(result)).toEqual(["framboise", "fougere"]);
	});

	/**
	 * L'ordre doit être STABLE : le mur se réarrangerait entre deux entrées de
	 * cache si deux teintes identiques permutaient d'un rendu à l'autre.
	 */
	it("départage deux teintes identiques par slug", () => {
		const result = sortColorsByHue([
			{ slug: "zeta", hex: "#F0568F" },
			{ slug: "alpha", hex: "#F0568F" },
		]);

		expect(slugs(result)).toEqual(["alpha", "zeta"]);
	});
});
