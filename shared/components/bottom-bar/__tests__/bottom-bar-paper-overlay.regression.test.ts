/**
 * @regression bottom-bar-paper-overlay
 *
 * La surface papier de la barre du bas est un pseudo-élément `::after` posé en
 * `inset: 0` sur la barre ENTIÈRE — donc par-dessus tous les onglets.
 *
 * Sans `pointer-events: none`, ce calque intercepte chaque tap : la barre reste
 * parfaitement lisible et devient totalement inerte. C'est un mode d'échec
 * silencieux — aucun test de rendu ne le voit, jsdom n'a pas de hit-testing, et
 * l'œil ne distingue pas une barre morte d'une barre vivante sur une capture.
 * La même règle vaut pour tout calque décoratif superposé à une zone
 * cliquable : `pointer-events: none` y est non négociable.
 *
 * Ce test lit le CSS compilé côté source (`app/styles/components.css`) parce que
 * c'est la seule surface où la règle existe : elle n'est pas exprimable en
 * utilitaire Tailwind.
 *
 * Toute modification requiert une review explicite.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(
	join(import.meta.dirname, "..", "..", "..", "..", "app", "styles", "components.css"),
	"utf8",
);

/** Corps de la règle `.bottom-bar-paper::after`, accolades comprises. */
function paperOverlayBlock(): string {
	const start = CSS.indexOf(".bottom-bar-paper::after");
	expect(start).toBeGreaterThan(-1);
	const open = CSS.indexOf("{", start);
	const close = CSS.indexOf("}", open);
	return CSS.slice(open, close);
}

describe("@regression bottom-bar-paper-overlay — le grain ne mange pas les taps", () => {
	it("le calque est inerte au pointeur", () => {
		expect(paperOverlayBlock()).toMatch(/pointer-events:\s*none/);
	});

	it("le calque couvre bien toute la barre (c'est ce qui rend la règle nécessaire)", () => {
		const block = paperOverlayBlock();
		expect(block).toMatch(/position:\s*absolute/);
		expect(block).toMatch(/inset:\s*0/);
	});

	/**
	 * Le grain doit rester DISCRET. À pleine force il se remarque sur une surface
	 * petite et toujours à l'écran, là où il passe inaperçu sur une carte qu'on
	 * survole — d'où .03 ici contre .035 pour `.polaroid-paper`.
	 */
	it("le grain reste sous 5 % d'opacité", () => {
		const opacity = paperOverlayBlock().match(/opacity:\s*([\d.]+)/);
		expect(opacity).not.toBeNull();
		expect(Number(opacity![1])).toBeGreaterThan(0);
		expect(Number(opacity![1])).toBeLessThanOrEqual(0.05);
	});
});
