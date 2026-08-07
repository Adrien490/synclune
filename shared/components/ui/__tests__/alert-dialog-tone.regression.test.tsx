/**
 * @regression alert-dialog-action-tone
 *
 * `tone` vivait dans `ui/responsive-alert-dialog.tsx` — une couche de 179 lignes
 * qui, malgré son préfixe, ne basculait RIEN selon le viewport : 7 de ses 9
 * exports étaient des pass-through dont le seul effet était de throw si un
 * contexte à un seul champ (`tone`) manquait, doublonnant le message que Base UI
 * émet déjà. Toute sa valeur ajoutée tenait en deux `Record` appliqués à un seul
 * de ses exports. Ils sont désormais sur `AlertDialogAction`.
 *
 * Ce que ce fichier verrouille, et pourquoi :
 *
 * 1. **L'apparence exacte des 5 tones.** Le déplacement change la façon dont les
 *    classes sont composées — `cn(buttonVariants(), TONE, callerCls)` au lieu de
 *    `cn(buttonVariants(), cn(TONE, callerCls))`. Même ordre, donc même arbitrage
 *    tailwind-merge, mais rien ne le garantissait : les chaînes sont assertées.
 * 2. **`tone` absent ⇒ aucune classe de tone ET aucune vibration.** Trois
 *    surfaces montent la primitive nue (`filter-sheet-wrapper`,
 *    `product-filter-rail`, `unsaved-changes-dialog`) et n'ont jamais vibré. Un
 *    défaut `"neutral"` leur ajouterait un retour haptique en silence.
 * 3. **`info` ≠ `neutral`.** Ils rendent la même apparence mais vibrent
 *    différemment (`light` vs `medium`). Sans cette assertion, la prochaine passe
 *    de nettoyage les fusionne « puisque c'est pareil » et supprime un arbitrage
 *    produit sans s'en apercevoir.
 * 4. **`type="submit"` de l'appelant survit.** Base UI pose `type: 'button'` sur
 *    tout `Close` ; le nôtre gagne uniquement grâce à l'ordre de `mergeProps`.
 *    C'est ce qui fait marcher les ~20 confirmations en `<form action>`, et ça se
 *    casserait sans bruit à une montée de version.
 */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogTitle,
	type AlertActionTone,
} from "../alert-dialog";

const vibrate = vi.fn((_pattern: number | number[]) => true);

/**
 * ⚠️ `triggerHaptic` garde un `lastTriggerAt` de MODULE avec 80 ms de cooldown :
 * il survit à `cleanup()` et à `mockClear()`. Sans horloge factice avancée entre
 * les cas, le premier passe et tous les suivants mesurent le cooldown — pas le
 * tone. D'où l'incrément explicite plutôt qu'un simple `useFakeTimers()`.
 */
let clock = new Date("2026-08-06T12:00:00Z").getTime();

beforeEach(() => {
	vibrate.mockClear();
	clock += 1_000;
	vi.useFakeTimers();
	vi.setSystemTime(clock);
	Object.defineProperty(window.navigator, "vibrate", {
		value: vibrate,
		configurable: true,
		writable: true,
	});
	// `triggerHaptic` court-circuite sur pointeur fin ET garde un cooldown global
	// de 80 ms entre deux vibrations — sans horloge factice, le 2ᵉ test d'une même
	// série mesurerait le cooldown, pas le tone.
	vi.spyOn(window, "matchMedia").mockImplementation(
		(query: string) =>
			({
				matches: query.includes("hover: none") || query.includes("pointer: coarse"),
				media: query,
				addEventListener: () => {},
				removeEventListener: () => {},
			}) as unknown as MediaQueryList,
	);
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

function renderAction(props: { tone?: AlertActionTone; className?: string } = {}) {
	render(
		<AlertDialog open>
			<AlertDialogContent>
				<AlertDialogTitle>Confirmer ?</AlertDialogTitle>
				<AlertDialogAction {...props}>Confirmer</AlertDialogAction>
			</AlertDialogContent>
		</AlertDialog>,
	);
	return screen.getByRole("button", { name: "Confirmer" });
}

/** Les classes propres à chaque tone, reprises verbatim de l'ex-wrapper. */
const TONE_CLASSES: Record<AlertActionTone, string[]> = {
	destructive: ["bg-destructive", "text-white", "can-hover:hover:bg-destructive/90"],
	warning: ["bg-warning", "text-warning-foreground", "can-hover:hover:bg-warning/90"],
	info: [],
	success: ["bg-success", "text-success-foreground", "can-hover:hover:bg-success/90"],
	neutral: [],
};

describe("AlertDialogAction — apparence par tone", () => {
	it.each(Object.entries(TONE_CLASSES))("« %s » porte exactement ses classes", (tone, classes) => {
		const action = renderAction({ tone: tone as AlertActionTone });

		expect(action).toHaveAttribute("data-tone", tone);
		for (const cls of classes) expect(action.className).toContain(cls);
	});

	it("sans tone : aucune classe de tone", () => {
		const action = renderAction();

		expect(action).not.toHaveAttribute("data-tone");
		for (const cls of Object.values(TONE_CLASSES).flat()) {
			expect(action.className).not.toContain(cls);
		}
	});

	it("la classe de l'appelant reste après celle du tone (elle doit pouvoir gagner)", () => {
		const action = renderAction({ tone: "destructive", className: "w-full sm:w-auto" });

		expect(action.className).toContain("w-full");
		expect(action.className.indexOf("w-full")).toBeGreaterThan(
			action.className.indexOf("bg-destructive"),
		);
	});

	it("`info` et `neutral` sont visuellement identiques", () => {
		const info = renderAction({ tone: "info" });
		const infoClass = info.className;
		cleanup();
		const neutral = renderAction({ tone: "neutral" });

		expect(neutral.className).toBe(infoClass);
	});
});

describe("AlertDialogAction — haptique par tone", () => {
	// Valeurs de `PATTERNS` (`shared/hooks/use-haptic.ts`), recopiées à dessein :
	// asserter le nom du pattern ne dirait pas si la table de tones a permuté.
	it.each([
		["destructive", "heavy", 40],
		["warning", "medium", 20],
		["info", "light", 10],
		["success", "success", [10, 30, 10]],
		["neutral", "medium", 20],
	] as const)("« %s » déclenche le pattern %s", (tone, _name, pattern) => {
		renderAction({ tone }).click();

		expect(vibrate).toHaveBeenCalledTimes(1);
		expect(vibrate).toHaveBeenCalledWith(pattern);
	});

	it("`info` et `neutral` NE vibrent PAS pareil (seul point qui les distingue)", () => {
		renderAction({ tone: "info" }).click();
		const infoPattern = vibrate.mock.calls[0]?.[0];

		cleanup();
		vibrate.mockClear();
		vi.setSystemTime(clock + 500); // franchir le cooldown global de 80 ms

		renderAction({ tone: "neutral" }).click();
		const neutralPattern = vibrate.mock.calls[0]?.[0];

		expect(infoPattern).toBeDefined();
		expect(neutralPattern).toBeDefined();
		expect(neutralPattern).not.toEqual(infoPattern);
	});

	it("sans tone : AUCUNE vibration", () => {
		renderAction().click();

		expect(vibrate).not.toHaveBeenCalled();
	});

	it("n'avale pas le `onClick` de l'appelant", () => {
		const onClick = vi.fn();
		render(
			<AlertDialog open>
				<AlertDialogContent>
					<AlertDialogTitle>Confirmer ?</AlertDialogTitle>
					<AlertDialogAction tone="destructive" onClick={onClick}>
						Confirmer
					</AlertDialogAction>
				</AlertDialogContent>
			</AlertDialog>,
		);

		screen.getByRole("button", { name: "Confirmer" }).click();

		expect(onClick).toHaveBeenCalledTimes(1);
	});
});

describe("AlertDialogAction — type du bouton", () => {
	it('garde le `type="submit"` de l\'appelant malgré le défaut Base UI', () => {
		render(
			<AlertDialog open>
				<AlertDialogContent>
					<form>
						<AlertDialogTitle>Confirmer ?</AlertDialogTitle>
						<AlertDialogAction type="submit" tone="destructive">
							Confirmer
						</AlertDialogAction>
					</form>
				</AlertDialogContent>
			</AlertDialog>,
		);

		expect(screen.getByRole("button", { name: "Confirmer" })).toHaveAttribute("type", "submit");
	});
});
