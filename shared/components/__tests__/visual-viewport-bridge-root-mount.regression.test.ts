/**
 * @regression keyboard-bridge-root-mount — le pont clavier est monté à la racine, une seule fois
 *
 * Bug corrigé : `<VisualViewportBridge />` n'était monté que dans
 * `app/(shop)/layout.tsx` et `app/admin/layout.tsx`. Or `/paiement` est un segment
 * **frère** du route-group `(shop)`, pas un enfant — tout comme `(auth)`,
 * `/suivi-commande` et `/paiement`. Sur ces routes, `<html data-keyboard="open">`
 * n'était donc JAMAIS posé, ce qui rendait inerte :
 *
 *   - `data-hide-on-keyboard` sur la barre « Commander et payer » fixe
 *     (`modules/payments/components/pay-button.tsx`) et sur `app/paiement/loading.tsx` ;
 *   - la règle CSS `html[data-keyboard="open"] [data-hide-on-keyboard]` (`app/globals.css`).
 *
 * Conséquence mobile, clavier ouvert, pendant la saisie de l'adresse de livraison :
 * sur iOS la barre fixe se ré-ancre au-dessus du clavier et peut recouvrir le champ
 * focalisé ; sur Android (`interactiveWidget` non déclaré ⇒ défaut `resizes-visual`)
 * elle reste derrière le clavier et le CTA de paiement devient inatteignable.
 *
 * Le test unitaire `visual-viewport-bridge.test.tsx` vérifiait déjà le composant en
 * isolation — rien ne vérifiait son MONTAGE. C'est l'objet de ce garde-fou : le
 * composant doit être monté dans `app/layout.tsx` et nulle part ailleurs (un montage
 * par route-group réintroduit mécaniquement des routes non couvertes).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..");
const APP_DIR = join(REPO_ROOT, "app");
const ROOT_LAYOUT = "app/layout.tsx";

const SKIP_DIRS = new Set(["node_modules", "__tests__", ".next", "generated"]);

const MOUNT_RE = /<VisualViewportBridge\s*\/>/;

function collectLayouts(dir: string, acc: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		if (SKIP_DIRS.has(entry)) continue;
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			collectLayouts(full, acc);
		} else if (entry === "layout.tsx") {
			acc.push(relative(REPO_ROOT, full).split(sep).join("/"));
		}
	}
	return acc;
}

describe("@regression keyboard-bridge-root-mount", () => {
	const layouts = collectLayouts(APP_DIR);

	it("collecte bien les layouts de app/ (garde-fou du garde-fou)", () => {
		// Si le scan ne trouve rien, les assertions ci-dessous passeraient à vide.
		expect(layouts.length).toBeGreaterThan(3);
		expect(layouts).toContain(ROOT_LAYOUT);
	});

	it("monte <VisualViewportBridge /> dans app/layout.tsx", () => {
		const source = readFileSync(join(REPO_ROOT, ROOT_LAYOUT), "utf8");
		expect(source).toMatch(MOUNT_RE);
		expect(source).toContain("@/shared/components/visual-viewport-bridge");
	});

	it("ne le monte dans aucun autre layout (sinon des routes restent non couvertes)", () => {
		const extraMounts = layouts
			.filter((path) => path !== ROOT_LAYOUT)
			.filter((path) => MOUNT_RE.test(readFileSync(join(REPO_ROOT, path), "utf8")));

		expect(extraMounts).toEqual([]);
	});

	it("couvre les routes hors (shop) qui portent des formulaires — /paiement en tête", () => {
		// Ces layouts existent et ne montent PAS le pont : ils dépendent donc
		// entièrement du montage racine. Si l'un disparaît, revoir ce test.
		const dependents = [
			"app/paiement/layout.tsx",
			"app/(auth)/layout.tsx",
			"app/suivi-commande/layout.tsx",
		];

		for (const path of dependents) {
			expect(layouts, `${path} attendu dans app/`).toContain(path);
			expect(readFileSync(join(REPO_ROOT, path), "utf8")).not.toMatch(MOUNT_RE);
		}
	});
});
