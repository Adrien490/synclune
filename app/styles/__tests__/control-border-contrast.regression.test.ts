/**
 * @regression control-border-contrast
 *
 * WCAG 1.4.11 (Non-text Contrast) : la bordure d'un contrôle de formulaire est
 * ce qui rend le contrôle PERCEPTIBLE — elle doit atteindre **3:1** contre la
 * surface qu'elle borde.
 *
 * La bordure dérivée de `--input` (L 0.94) mesurait **1,16:1** sur
 * `--background` : une case à cocher non cochée était invisible (audit panneau
 * de filtres 2026-08-04, P1). Correctif lot 0 : `border-muted-foreground`
 * (~7:1, token documenté AA) au repos sur `checkbox.tsx` et `radio-group.tsx`,
 * survol vers `brand-rose-strong` (assombrir, jamais éclaircir — l'ancien
 * survol pastel dérivé de `--ring` inversait l'affordance).
 *
 * `--input` lui-même n'est PAS modifié : les champs texte (`Input`) gardent
 * leur bordure — leur zone est perceptible par d'autres moyens (fond, ombre),
 * hors périmètre de ce garde.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { contrastRatio, oklchToLinearSrgb, readOklch } from "@/test/utils/oklch";

const REPO_ROOT = join(__dirname, "..", "..", "..");

const CONTROLS = ["checkbox.tsx", "radio-group.tsx"] as const;

const MIN_RATIO = 3;

const tokenRgb = (token: string) => oklchToLinearSrgb(...readOklch(token));

describe("@regression control-border-contrast", () => {
	for (const file of CONTROLS) {
		describe(file, () => {
			const source = readFileSync(join(REPO_ROOT, "shared", "components", "ui", file), "utf-8");

			it("la bordure au repos est border-muted-foreground, pas border-input", () => {
				expect(
					source.includes("border-muted-foreground"),
					"la bordure au repos doit rester `border-muted-foreground` (≥3:1)",
				).toBe(true);
				expect(
					source.includes("border-input"),
					"`border-input` (1,16:1) : le contrôle non coché redevient invisible",
				).toBe(false);
			});

			it("le survol assombrit vers le rose profond, il n'éclaircit pas", () => {
				expect(source.includes("can-hover:hover:border-brand-rose-strong")).toBe(true);
				expect(
					source.includes("hover:border-ring"),
					"`hover:border-ring` pastel ÉCLAIRCIT une bordure désormais sombre — affordance inversée",
				).toBe(false);
			});
		});
	}

	it("border-muted-foreground atteint 3:1 sur --background et --card", () => {
		const ink = tokenRgb("--muted-foreground");
		for (const surface of ["--background", "--card"] as const) {
			expect(
				contrastRatio(ink, tokenRgb(surface)),
				`--muted-foreground doit atteindre ${MIN_RATIO}:1 sur ${surface} (WCAG 1.4.11)`,
			).toBeGreaterThanOrEqual(MIN_RATIO);
		}
	});
});
