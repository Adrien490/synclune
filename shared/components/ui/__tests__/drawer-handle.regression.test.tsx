import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SheetHandle } from "../sheet";

/**
 * @regression drawer-handle-sole-gesture-affordance-2026-08-05
 *
 * La poignée des panneaux du bas est la SEULE zone préhensible en mode `handleOnly`
 * (cf. l'allowlist de `handle-only-allowlist.regression.test.ts` : le panier et le
 * panneau de filtres). À ce titre elle doit être une vraie affordance, pas un liseré :
 *
 * 1. **Contraste ≥ 3:1 (WCAG 1.4.11).** Elle était à `bg-muted-foreground/30`, soit
 *    **1,35:1** sur `--background`. ⚠️ Les paliers intermédiaires ne suffisent pas et
 *    l'estimation à l'œil se trompe de plus d'un point : `/45` = 1,63:1, `/60` = 2,07:1,
 *    `/70` = 2,52:1, **`/80` = 3,22:1**. Ce test verrouille le palier, pas « une valeur
 *    plus foncée ».
 *
 * 2. **Une cible de la taille d'un pouce, SANS recouvrir ses voisins.** La pastille fait
 *    8 px de haut. `SheetHandle` l'élargissait par un `before:` absolu de ±40/±24 px, ce
 *    qui (a) se faisait clipper par l'`overflow-hidden` des popups du bas et (b) peignait
 *    par-dessus l'en-tête en y avalant les clics. D'où une bande de préhension EN FLUX.
 *
 * 3. **Aucune couche a11y décorative.** Un `<div>` nu portait `aria-label` (ignoré des AT
 *    sans rôle) et `focus-ring` (intégralement `:focus-visible`, donc inapplicable à un
 *    élément non focusable). Les deux mentaient. La fermeture est portée par le bouton
 *    « Fermer » (44×44), qui est l'équivalent au sens de WCAG 2.5.8.
 *
 * Les deux primitives sont testées ensemble : leur DIVERGENCE est ce qui a laissé le
 * défaut vivre côté Drawer alors que le Sheet avait déjà (partiellement) traité le sujet.
 */

/** Le palier de contraste conforme. `/70` = 2,52:1 ne passe pas ; `/80` = 3,22:1 passe. */
const CONFORMING_PILL_TONE = "bg-muted-foreground/80";
const NON_CONFORMING_TONES = ["/30", "/45", "/60", "/70"];

/**
 * `DrawerHandle` n'est pas exporté (`DrawerContent` la rend lui-même, elle n'a aucun call
 * site), et l'exporter pour le confort d'un test créerait une API publique morte que knip
 * signalerait. Ses invariants sont donc vérifiés à la SOURCE, et un test de symétrie
 * ci-dessous garantit que les deux primitives restent d'accord — leur divergence étant
 * précisément ce qui a laissé le défaut vivre côté Drawer.
 */
function primitiveSource(file: "drawer" | "sheet"): string {
	return readFileSync(join(process.cwd(), "shared", "components", "ui", `${file}.tsx`), "utf8");
}

describe.each([["SheetHandle", SheetHandle, "sheet-handle"]])(
	"@regression %s (au rendu)",
	(_name, Handle, pillSlot) => {
		it("peint la pastille au palier de contraste conforme", () => {
			const { container } = render(<Handle />);
			const pill = container.querySelector(`[data-slot="${pillSlot}"]`);
			expect(pill).not.toBeNull();
			expect(pill!.className).toContain(CONFORMING_PILL_TONE);
			for (const tone of NON_CONFORMING_TONES) {
				expect(pill!.className).not.toContain(`bg-muted-foreground${tone}`);
			}
		});

		it("étend la cible par une bande EN FLUX, jamais par un pseudo-élément absolu", () => {
			const { container } = render(<Handle />);
			const grip = container.querySelector(`[data-slot="${pillSlot}-grip"]`);
			expect(grip, "la pastille doit être enveloppée d'une bande de préhension").not.toBeNull();
			expect(grip!.className).toMatch(/\bw-full\b/);
			expect(grip!.className).toMatch(/\bpy-\d/);
			expect(grip!.className).toContain("cursor-grab");
			// `before:-inset-*` recouvrirait l'en-tête et serait clippé par `overflow-hidden`.
			expect(grip!.className).not.toMatch(/before:-?inset/);
			expect(container.querySelector(`[data-slot="${pillSlot}"]`)!.className).not.toMatch(
				/before:-?inset/,
			);
		});

		it("ne prétend pas être un contrôle accessible", () => {
			const { container } = render(<Handle />);
			const grip = container.querySelector(`[data-slot="${pillSlot}-grip"]`)!;
			expect(grip).toHaveAttribute("aria-hidden", "true");
			expect(grip).not.toHaveAttribute("role");
			expect(grip).not.toHaveAttribute("tabindex");
			expect(grip).not.toHaveAttribute("aria-label");
			// `focus-ring` est 100 % `:focus-visible` : sur un élément non focusable il ne peut
			// jamais s'appliquer. Le garder suggérerait à tort une affordance clavier.
			expect(grip.className).not.toContain("focus-ring");
		});

		it("n'impose aucune marge, pour que le call site n'en ajoute pas une seconde", () => {
			// `admin-menu-sheet.tsx` passait `className="mt-3 mb-1"` en DOUBLE de la marge que
			// la primitive posait déjà. Avec une bande en `py-*`, une marge par défaut
			// s'ajouterait au padding au lieu de le remplacer.
			const { container } = render(<Handle />);
			const grip = container.querySelector(`[data-slot="${pillSlot}-grip"]`)!;
			expect(grip.className).not.toMatch(/\bm[tby]?-\d/);
		});
	},
);

describe("@regression DrawerHandle (à la source)", () => {
	it("peint la pastille au palier conforme et pas un palier inférieur", () => {
		const src = primitiveSource("drawer");
		expect(src).toContain(CONFORMING_PILL_TONE);
		for (const tone of NON_CONFORMING_TONES) {
			expect(src, `bg-muted-foreground${tone} ne passe pas WCAG 1.4.11`).not.toContain(
				`bg-muted-foreground${tone}`,
			);
		}
	});

	it("enveloppe la pastille d'une bande en flux, sans pseudo-élément ni marge", () => {
		const handle = primitiveSource("drawer").match(/function DrawerHandle\([\s\S]*?\n}\n/)?.[0];
		expect(handle, "DrawerHandle introuvable").toBeTruthy();
		expect(handle!).toContain('data-slot="drawer-handle-grip"');
		expect(handle!).toContain('aria-hidden="true"');
		expect(handle!).toContain("cursor-grab");
		expect(handle!).toMatch(/\bw-full\b/);
		expect(handle!).toMatch(/\bpy-\d/);
		expect(handle!).not.toMatch(/before:-?inset/);
		expect(handle!).not.toContain("focus-ring");
		// Ni `aria-label` (ignoré sur un div sans rôle) ni marge par défaut.
		expect(handle!).not.toContain("aria-label");
		expect(handle!).not.toMatch(/"[^"]*\bm[tby]?-\d/);
	});

	it("les deux primitives restent d'accord sur la pastille", () => {
		// Leur DIVERGENCE est la cause racine : le Sheet avait déjà relevé son contraste
		// (`/45`) et étendu sa cible, le Drawer était resté à `/30` sans zone tactile — et
		// c'est le Drawer que rend le panier.
		const pill = /data-slot="(?:drawer|sheet)-handle"\s+className="([^"]+)"/;
		const drawerPill = primitiveSource("drawer").match(pill)?.[1];
		const sheetPill = primitiveSource("sheet").match(pill)?.[1];
		expect(drawerPill).toBeTruthy();
		expect(drawerPill).toBe(sheetPill);
	});
});

describe("@regression la poignée reste hors du garde anti-swipe", () => {
	it("`DrawerContent` rend la poignée AVANT d'ouvrir `DrawerSwipeGuard`", () => {
		// Invariant d'ORDRE JSX, donc vérifié à la source : sous `handleOnly`, Base UI exclut
		// du geste tout ce qui vit sous un `[data-base-ui-swipe-ignore]`. Si la poignée
		// tombait dans le garde, le panneau ne serait plus fermable au doigt DU TOUT — c'est
		// exactement le scénario qui a laissé le panier mobile sans aucune sortie de geste.
		const src = readFileSync(
			join(process.cwd(), "shared", "components", "ui", "drawer.tsx"),
			"utf8",
		);
		const handleAt = src.indexOf("<DrawerHandle />");
		const guardAt = src.indexOf("<DrawerSwipeGuard");
		expect(handleAt).toBeGreaterThan(-1);
		expect(guardAt).toBeGreaterThan(-1);
		expect(handleAt).toBeLessThan(guardAt);
		// Et le garde ne prend que `children`, jamais la poignée.
		expect(src).toMatch(
			/<DrawerSwipeGuard enabled=\{handleOnly\}>\{children\}<\/DrawerSwipeGuard>/,
		);
	});
});
