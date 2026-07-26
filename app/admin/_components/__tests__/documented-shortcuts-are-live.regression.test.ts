import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression admin-cheatsheet-no-dead-shortcut
 *
 * La cheatsheet admin annonçait `⌘K — Recherche rapide de produits` alors
 * qu'aucun listener ⌘K n'existe sous `app/admin/**` : `QuickSearchDialogAsync`
 * (et son `QuickSearchKeyboardShortcut`) ne sont montés que dans
 * `app/(shop)/layout.tsx`. C'était un fossile du retrait d'`AdminQuickSearchDialog`
 * — un raccourci documenté que la touche ne déclenche pas.
 *
 * Test **statique** : la dérive est documentaire, invisible à tout test de rendu
 * (le dialogue affiche fidèlement ce qu'on lui donne). On extrait les combos
 * déclarés et on exige que chacun figure dans l'allow-list ci-dessous, dont
 * chaque entrée est adossée à un listener réel vérifié.
 */

const DIALOG_PATH = join(process.cwd(), "app/admin/_components/keyboard-shortcuts-dialog.tsx");

/**
 * Combos réellement écoutés, avec la source du listener :
 * - `⌘B` → `shared/components/ui/sidebar.tsx` (`SIDEBAR_KEYBOARD_SHORTCUT`)
 * - `?` → `keyboard-shortcuts-dialog.tsx` lui-même
 * - `Echap` → Radix (dialogues/menus) + `use-admin-form-keyboard.ts`
 * - `⌥←` / `⌥→` → `shared/components/cursor-pagination/cursor-pagination.tsx`
 * - `⌘⏎` → `shared/components/filter-sheet-wrapper.tsx`
 * - `⌘S` → `shared/hooks/use-admin-form-keyboard.ts`
 *
 * ⚠️ N'ajouter une entrée ici qu'après avoir vérifié le listener correspondant.
 */
const LIVE_SHORTCUTS = new Set(["⌘+B", "?", "Echap", "⌥+←", "⌥+→", "⌘+⏎", "⌘+S"]);

function declaredShortcutCombos(source: string): string[] {
	const combos: string[] = [];
	// Matche chaque `keys: [...]` littéral du tableau SHORTCUT_GROUPS.
	const keysArrayPattern = /keys:\s*\[([^\]]*)\]/g;
	for (const match of source.matchAll(keysArrayPattern)) {
		const raw = match[1] ?? "";
		const keys = [...raw.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
		// `keys: []` = entrée purement descriptive (pas un raccourci) → ignorée.
		if (keys.length > 0) combos.push(keys.join("+"));
	}
	return combos;
}

describe("cheatsheet raccourcis admin", () => {
	const source = readFileSync(DIALOG_PATH, "utf8");

	it("extrait bien des combos (le parseur n'est pas vide pour la mauvaise raison)", () => {
		// Sans cette garde, un regex cassé rendrait le test suivant vert à tort.
		expect(declaredShortcutCombos(source).length).toBeGreaterThanOrEqual(5);
	});

	it("n'annonce aucun raccourci sans listener", () => {
		const dead = declaredShortcutCombos(source).filter((combo) => !LIVE_SHORTCUTS.has(combo));

		expect(
			dead,
			`Raccourcis documentés sans listener: ${dead.join(", ")}. Soit brancher un listener, soit retirer la ligne de SHORTCUT_GROUPS.`,
		).toEqual([]);
	});

	it("n'annonce plus ⌘K (aucun listener sous app/admin)", () => {
		expect(declaredShortcutCombos(source)).not.toContain("⌘+K");
	});
});
