/**
 * @regression animate-out-fill-mode
 *
 * « Les modales clignotent quand elles se ferment » — audit overlays Base UI
 * 2026-08-04.
 *
 * ## Le défaut
 *
 * Les keyframes de tw-animate-css sont ASYMÉTRIQUES :
 *
 * ```css
 * @keyframes enter { from { opacity: var(--tw-enter-opacity, 1); … } }
 * @keyframes exit  { to   { opacity: var(--tw-exit-opacity, 1);  … } }
 * ```
 *
 * `enter` n'a qu'un `from` : son état final est le style de base, donc l'état
 * voulu. `exit` n'a qu'un `to`, et le raccourci `animation` qu'émettent
 * `animate-in`/`animate-out` fixe `var(--tw-animation-fill-mode, none)`. Sans
 * fill mode, un élément encore monté à la fin de son `animate-out` **revient à
 * son style de base — c'est-à-dire pleinement visible**. D'où un bug qui ne se
 * manifeste qu'à la FERMETURE.
 *
 * ## Pourquoi ça touchait les scrims et pas les popups
 *
 * Base UI ne pilote le démontage QUE par les animations du popup :
 * `useOpenStateTransitions` (`utils/popups/popupStoreUtils.js`) passe
 * `ref: store.context.popupRef` à `useOpenChangeComplete`, et
 * `useAnimationsFinished` appelle `element.getAnimations()` — sur ce seul
 * élément, sans sous-arbre. Le `Backdrop` n'est jamais attendu. Le popup, lui,
 * est démonté dans un `ReactDOM.flushSync` avant la peinture de la frame où son
 * animation s'achève : il ne clignote pas. Le scrim, si — dès que son animation
 * finit AVANT celle du popup.
 *
 * Écarts constatés (durée par défaut de tw-animate-css = 150 ms) :
 *
 * | Surface       | Scrim  | Popup                             | Scrim ressuscité |
 * | ------------- | ------ | --------------------------------- | ---------------- |
 * | `Sheet`       | 150 ms | 300 ms (`PANEL_TRANSITION`)       | **150 ms**       |
 * | `Drawer`      | 150 ms | 300 ms (`PANEL_TRANSITION`)       | **150 ms**       |
 * | `Dialog`      | 150 ms | 200 ms (`motion-safe:duration-200`) | **50 ms**      |
 * | `AlertDialog` | 200 ms | 200 ms                            | 0 (par chance)   |
 *
 * ## Les deux règles verrouillées ici
 *
 * 1. Tout `animate-out` porte un `fill-mode-*` — la protection structurelle,
 *    valable même si quelqu'un désaligne les durées à nouveau.
 * 2. Les 4 scrims déclarent une durée EXPLICITE, égale à celle de leur popup —
 *    la protection esthétique : un scrim qui s'évapore avant que le panneau ait
 *    fini de sortir laisse le panneau glisser sur la page nue.
 *
 * Ne pas remplacer la règle 1 par la règle 2 seule : les durées se
 * désynchronisent en silence, le fill mode non.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const UI_DIR = join(__dirname, "..");

/** Les commentaires citent `animate-out` — les compter fausserait la parité. */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function countMatches(source: string, pattern: RegExp): number {
	return source.match(pattern)?.length ?? 0;
}

/**
 * Corps d'une fonction de premier niveau, du `function X(` à la déclaration de
 * premier niveau suivante.
 *
 * ⚠️ Deux bornes plus évidentes sont FAUSSES ici, les deux constatées :
 * - « jusqu'au `function` suivant » laisse entrer `PANEL_TRANSITION` (déclaré
 *   entre `SheetOverlay` et `SheetContent`), et la règle 2 comparait alors
 *   `duration-300` avec lui-même — verte avec un scrim sans aucune durée ;
 * - « jusqu'au premier `}` en colonne 0 » coupe dans la destructuration des
 *   props (`}: Omit<DialogPrimitive.Popup.Props, …>`), avant le `className`.
 */
function functionBody(source: string, name: string): string {
	const start = source.indexOf(`function ${name}(`);
	expect(start, `\`function ${name}(\` introuvable`).toBeGreaterThanOrEqual(0);

	const end = ["\nfunction ", "\nconst ", "\nexport "]
		.map((token) => source.indexOf(token, start + 1))
		.filter((index) => index !== -1)
		.reduce((min, index) => Math.min(min, index), source.length);

	return source.slice(start, end);
}

function soleDuration(fragment: string, label: string): number {
	const found = [...fragment.matchAll(/duration-(\d+)\b/g)].map((m) => Number(m[1]));
	const unique = [...new Set(found)];
	expect(unique, `${label} : une et une seule durée explicite attendue`).toHaveLength(1);
	return unique[0]!;
}

describe("@regression animate-out-fill-mode", () => {
	const files = readdirSync(UI_DIR).filter((f) => f.endsWith(".tsx"));

	describe("règle 1 — tout `animate-out` porte un fill mode", () => {
		it.each(files)("%s", (file) => {
			const source = stripComments(readFileSync(join(UI_DIR, file), "utf8"));
			const exits = countMatches(source, /\banimate-out\b/g);
			if (exits === 0) return;

			expect(
				countMatches(source, /\bfill-mode-[a-z]+\b/g),
				`${file} : ${exits} \`animate-out\` mais pas autant de \`fill-mode-*\`. ` +
					"Sans fill mode, l'élément redevient VISIBLE à la fin de son animation " +
					"de sortie (les keyframes `exit` n'ont qu'un `to`).",
			).toBe(exits);
		});
	});

	describe("règle 2 — le scrim dure aussi longtemps que son popup", () => {
		it("Dialog : scrim et popup à 200 ms", () => {
			const source = readFileSync(join(UI_DIR, "dialog.tsx"), "utf8");
			expect(soleDuration(functionBody(source, "DialogOverlay"), "DialogOverlay")).toBe(
				soleDuration(functionBody(source, "DialogContent"), "DialogContent"),
			);
		});

		it("AlertDialog : scrim et popup à 200 ms", () => {
			const source = readFileSync(join(UI_DIR, "alert-dialog.tsx"), "utf8");
			expect(soleDuration(functionBody(source, "AlertDialogOverlay"), "AlertDialogOverlay")).toBe(
				soleDuration(functionBody(source, "AlertDialogContent"), "AlertDialogContent"),
			);
		});

		it.each([
			["sheet.tsx", "SheetOverlay"],
			["drawer.tsx", "DrawerOverlay"],
		])("%s : scrim aligné sur PANEL_TRANSITION", (file, overlayFn) => {
			const source = readFileSync(join(UI_DIR, file), "utf8");
			const panel = source.match(/const PANEL_TRANSITION = "([^"]+)"/)?.[1];
			expect(panel, `${file} : \`PANEL_TRANSITION\` introuvable`).toBeDefined();

			expect(soleDuration(functionBody(source, overlayFn), overlayFn)).toBe(
				soleDuration(panel!, "PANEL_TRANSITION"),
			);
		});
	});
});
