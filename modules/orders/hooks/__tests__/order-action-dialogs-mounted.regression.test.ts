/**
 * @regression order-action-dialogs-mounted
 *
 * Audit « Admin commandes » 2026-07-26 (P1-3). `useOrderActions` expose l'item
 * « Supprimer » sur les DEUX surfaces (il n'est pas dans `DETAIL_HIDDEN_KEYS` de
 * `order-header.tsx`), mais `DeleteOrderAlertDialog` n'était monté que sur la page
 * LISTE. Depuis la page détail, cliquer « Supprimer » ouvrait un dialog inexistant :
 * **no-op totalement silencieux**, sans erreur console.
 *
 * Aucun test ne pouvait l'attraper : `order-detail-page.test.tsx` et
 * `order-header.test.tsx` mockent le store de dialogs, donc le montage réel n'est
 * jamais observé. Ce garde-fou-ci travaille sur les SOURCES : tout dialog dont
 * `useOrderActions` détient une poignée doit être monté sur les deux surfaces.
 *
 * Il est volontairement statique (et non un rendu) : c'est la seule façon de vérifier
 * un montage manquant sans dépendre du store mocké.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

const root = process.cwd();

const HOOK = readFileSync(join(root, "modules/orders/hooks/use-order-actions.ts"), "utf-8");
const HEADER = readFileSync(
	join(root, "modules/orders/components/admin/order-detail/order-header.tsx"),
	"utf-8",
);
const DETAIL_PAGE = readFileSync(
	join(root, "app/admin/(protected)/ventes/commandes/[id]/page.tsx"),
	"utf-8",
);
const LIST_DIALOGS = readFileSync(
	join(root, "app/admin/(protected)/ventes/commandes/_components/orders-admin-dialogs.tsx"),
	"utf-8",
);

/** Retire commentaires de ligne et de bloc (un `import` cité en prose ne compte pas). */
function stripComments(source: string): string {
	return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/**
 * Composants de dialog dont le hook détient une poignée, déduits de ses imports
 * `*_DIALOG_ID` : `../components/admin/mark-as-paid-alert-dialog` → `MarkAsPaidAlertDialog`.
 */
function dialogComponentsUsedByHook(): string[] {
	const hook = stripComments(HOOK);
	const modules = [
		...hook.matchAll(/_DIALOG_ID\s*}\s*from\s*"\.\.\/components\/admin\/([\w-]+)"/g),
	].map((m) => m[1]!);

	// kebab-case du fichier → PascalCase du composant exporté
	// (`mark-as-paid-alert-dialog` → `MarkAsPaidAlertDialog`).
	return [...new Set(modules)].map((mod) =>
		mod
			.split("-")
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(""),
	);
}

describe("@regression order-action-dialogs-mounted", () => {
	const components = dialogComponentsUsedByHook();

	it("détecte bien les dialogs du hook (garde-fou du garde-fou)", () => {
		// Si ce compte tombe à 0, la regex ci-dessus a cessé de matcher et le test
		// deviendrait vert pour rien.
		expect(components.length).toBeGreaterThanOrEqual(10);
		expect(components).toContain("DeleteOrderAlertDialog");
	});

	it.each([
		["page détail", () => stripComments(DETAIL_PAGE)],
		["page liste", () => stripComments(LIST_DIALOGS)],
	])("monte tous les dialogs du menu d'actions (%s)", (surface, getSource) => {
		const source = getSource();
		const hidden = detailHiddenKeys();

		const missing = components.filter(
			(component) =>
				!source.includes(`<${component} `) &&
				!source.includes(`<${component}/`) &&
				!source.includes(`<${component}>`),
		);

		expect(
			missing,
			`${surface} : dialog(s) référencé(s) par useOrderActions mais non monté(s) — ` +
				`le clic sur l'item correspondant serait un no-op silencieux. ` +
				`Clés masquées sur le détail : ${[...hidden].join(", ") || "(aucune)"}`,
		).toEqual([]);
	});
});

/** Clés d'items masquées sur la page détail (informatif dans le message d'erreur). */
function detailHiddenKeys(): Set<string> {
	const match = HEADER.match(/DETAIL_HIDDEN_KEYS\s*=\s*new Set\(\[([^\]]*)\]\)/);
	if (!match) return new Set();
	return new Set([...match[1]!.matchAll(/"([^"]+)"/g)].map((m) => m[1]!));
}
