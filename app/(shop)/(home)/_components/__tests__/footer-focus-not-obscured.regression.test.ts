import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * @regression footer-focus-not-obscured
 *
 * WCAG 2.4.11 « Focus Not Obscured (Minimum) », AA — nouveau en 2.2.
 *
 * Mesuré le 2026-08-06 à 390 × 844 sur le rendu réel : au clavier, les **six**
 * liens légaux du rail bas du pied de page recevaient le focus à y 800-844, sous
 * une bottom-nav qui commence à 787. Ils étaient donc **entièrement** masqués —
 * et ce sont précisément les liens que le droit français impose d'atteindre
 * depuis `/` (CGV, mentions légales, rétractation…).
 *
 * ⚠️ **Le correctif tient en DEUX pièces, et aucune ne suffit seule** :
 *
 *  1. `scroll-padding-bottom` sur `html:has([data-shop-shell])` — traite le focus
 *     en milieu de page, là où il reste du défilement à faire ;
 *  2. une réserve d'espace réelle au pied de page — parce qu'en **bas** du
 *     document il n'y a plus rien à faire défiler, et qu'aucun `scroll-padding`
 *     n'y écarte quoi que ce soit.
 *
 * C'est la pièce 2 qui a été oubliée pendant que l'admin et le checkout, eux,
 * avaient déjà la 1. Le test vérifie les deux ensemble : retirer l'une rend
 * l'autre décorative, sans qu'aucune erreur n'apparaisse.
 */
const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("pied de page — focus non masqué par la bottom-nav (@regression footer-focus-not-obscured)", () => {
	it("réserve la hauteur de la barre au bas du document, et la libère à lg", () => {
		const footer = read("app/(shop)/(home)/_components/footer.tsx");

		// Convention de RÉSERVE du dépôt : fallback 56px (pas 0px), gaté au
		// breakpoint où la barre disparaît — `lg` pour la boutique, `md` pour l'admin.
		expect(footer).toContain("pb-[calc(var(--bottom-bar-height,56px)+1rem)]");
		expect(footer).toContain("lg:pb-0");
	});

	it("pose le scroll-padding-bottom de la boutique, et le remet à zéro à lg", () => {
		const globals = read("app/globals.css");
		const layout = read("app/(shop)/layout.tsx");

		// Le marqueur que cible `html:has(...)` doit exister dans l'arbre boutique,
		// sinon la règle ne s'applique à rien — en silence.
		expect(layout).toContain("data-shop-shell");

		expect(globals).toContain("html:has([data-shop-shell])");
		expect(globals).toMatch(
			/html:has\(\[data-shop-shell\]\)\s*\{\s*scroll-padding-bottom:\s*calc\(var\(--bottom-bar-height,\s*56px\)\s*\+\s*1rem\)/,
		);
		// Le seuil est `lg` (64rem) et non `md` : la bottom-nav boutique couvre
		// l'iPad portrait, contrairement à celle de l'admin.
		expect(globals).toMatch(
			/@media \(width >= 64rem\) \{\s*html:has\(\[data-shop-shell\]\)\s*\{\s*scroll-padding-bottom:\s*0/,
		);
	});
});
