/**
 * @regression slider-state-ink
 *
 * WCAG 1.4.11 (Non-text Contrast) : le remplissage du slider est un indicateur
 * d'état (la plage sélectionnée) et doit atteindre **3:1** contre ses couleurs
 * adjacentes — le rail (`--muted`) et la surface (`--background`).
 *
 * En rose pastel (`--primary`), le remplissage mesurait **1,34:1** contre le
 * rail : à la plage par défaut (rail entièrement couvert), le curseur de prix
 * était un trait rose uni sans poignée discernable (audit panneau de filtres
 * 2026-08-04, P1). Correctif lot 0 : remplissage `bg-brand-rose-strong` et
 * poignées cerclées `border-brand-rose-strong border-3` — même doctrine que la
 * checkbox cochée (« le rose doit être VU », cf. globals.css).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { contrastRatio, oklchToLinearSrgb, readOklch } from "@/test/utils/oklch";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const SLIDER = readFileSync(join(REPO_ROOT, "shared", "components", "ui", "slider.tsx"), "utf-8");

const MIN_RATIO = 3;

const tokenRgb = (token: string) => oklchToLinearSrgb(...readOklch(token));

describe("@regression slider-state-ink", () => {
	it("le remplissage (Indicator) est peint en rose profond, pas en pastel", () => {
		expect(
			SLIDER.includes("bg-brand-rose-strong"),
			"le remplissage du slider doit rester `bg-brand-rose-strong`",
		).toBe(true);
		expect(
			/"bg-primary /.test(SLIDER),
			"`bg-primary` sur le slider : le remplissage pastel retombe à 1,34:1 contre le rail",
		).toBe(false);
	});

	it("les poignées sont cerclées du même rose profond", () => {
		expect(SLIDER.includes("border-brand-rose-strong")).toBe(true);
		expect(
			SLIDER.includes("border-primary"),
			"`border-primary` sur une poignée : cercle pastel indiscernable du remplissage",
		).toBe(false);
	});

	it("le rose profond atteint 3:1 contre le rail et la surface", () => {
		const ink = tokenRgb("--color-brand-rose-strong");
		for (const surface of ["--muted", "--background"] as const) {
			expect(
				contrastRatio(ink, tokenRgb(surface)),
				`--color-brand-rose-strong doit atteindre ${MIN_RATIO}:1 sur ${surface} (WCAG 1.4.11)`,
			).toBeGreaterThanOrEqual(MIN_RATIO);
		}
	});
});
