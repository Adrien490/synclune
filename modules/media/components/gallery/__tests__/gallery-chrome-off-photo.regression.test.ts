/**
 * @regression gallery-chrome-off-photo
 *
 * Redesign « Le carnet » (2026-08-04). La galerie produit posait son chrome SUR
 * la photo et le masquait jusqu'au survol. Ce test verrouille le contrat
 * inverse, parce que chacun des quatre défauts se réintroduit tout seul :
 *
 * 1. **Rien n'est révélé au survol.** Les commandes vivent sur le carton
 *    d'encadrement, elles sont donc permanentes. Au repos, une galerie desktop
 *    n'offrait qu'une pastille « 3 / 7 » — et l'entrée de la souris déclenchait
 *    quatre transitions d'un coup (zoom ×3, deux flèches, anneau du cadre).
 *    Corollaire : les entrées `navigation.tsx` / `zoom-button.tsx` ont été
 *    RETIRÉES de `hover-focus-parity.regression.test.ts`. Ré-ajouter un
 *    `opacity-0` ici, c'est rouvrir les deux défauts d'un coup.
 *
 * 2. **Plus de verre noir ni de disque rose.** `bg-black/60` était un chrome de
 *    visionneuse générique sur une boutique de bijoux faits main ; `bg-primary`
 *    (`#fdb8e4`) plafonnait à **1,60:1** de contraste de bord contre un fond
 *    clair, là où WCAG 1.4.11 demande 3:1 — sur un packshot sur fond blanc, le
 *    bouton n'avait aucun bord perceptible.
 *
 * 3. **Le chrome et le slide basculent au MÊME seuil.** Le chrome était en
 *    `sm:` (40rem) et le slide en `mediaAtLeast("md")` (48rem) : entre 640 et
 *    767 px — l'iPad Mini portrait fait 744 — on rendait le chrome souris
 *    par-dessus un `GalleryPinchZoom` qui attend un pincement.
 *
 * 4. **Le pager mort n'existe plus.** `GalleryDots` basculait au-delà de 5
 *    photos sur un badge fraction non interactif. À 5-8 photos par bijou, c'était
 *    le cas NOMINAL : le seul contrôle qui ressemblait à un pager était mort, et
 *    doublait une bande de vignettes qui, elle, fonctionnait.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "..", "..", "..", "..");
const GALLERY_DIR = "shared/components/gallery";

/**
 * Fichiers de chrome — `hover-zoom.tsx` est l'image elle-même, pas du chrome.
 *
 * `token.styles.ts` en fait partie depuis l'extraction de la SSOT du jeton : les
 * classes de SURFACE (celles que les interdits ci-dessous visent) y ont déménagé.
 * Sans lui dans cette liste, un `bg-primary` réintroduit dans la SSOT passerait
 * sous le radar tout en s'appliquant aux deux jetons à la fois — le garde-fou
 * serait devenu vide au moment précis où il devenait le plus utile.
 */
const CHROME_FILES = [
	`${GALLERY_DIR}/counter.tsx`,
	`${GALLERY_DIR}/navigation.tsx`,
	`${GALLERY_DIR}/zoom-button.tsx`,
	`${GALLERY_DIR}/token.styles.ts`,
] as const;

/**
 * Lit un fichier **sans ses commentaires**.
 *
 * ⚠️ Non négociable ici : chacun de ces composants documente en tête la classe
 * qu'il a retirée (« plus de `opacity-0` », « pas `bg-primary` », « avec `sm:`,
 * la plage 640-767 px… »). Un scan brut fait donc échouer le garde-fou sur sa
 * propre justification — et la seule façon de le « réparer » serait d'effacer
 * l'explication, c'est-à-dire de perdre le pourquoi et de garder le quoi.
 */
function read(relativePath: string): string {
	return readFileSync(join(REPO_ROOT, relativePath), "utf-8")
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.split("\n")
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

describe("@regression gallery-chrome-off-photo", () => {
	describe("1. rien n'est révélé au survol", () => {
		for (const file of CHROME_FILES) {
			it(`${file} ne masque aucun contrôle`, () => {
				const source = read(file);
				expect(
					source.includes("opacity-0"),
					`${file} remet un contrôle en \`opacity-0\`.\n` +
						"Le chrome de la galerie est PERMANENT depuis « Le carnet » : il vit sur le\n" +
						"carton, pas sur la photo, donc il n'a rien à révéler. Si un masquage est\n" +
						"vraiment nécessaire, il faut rouvrir l'arbitrage ET remettre l'entrée\n" +
						"correspondante dans hover-focus-parity.regression.test.ts.",
				).toBe(false);
			});
		}
	});

	describe("2. ni verre noir, ni disque rose", () => {
		for (const file of CHROME_FILES) {
			it(`${file} n'utilise pas de pastille de verre noir`, () => {
				expect(read(file)).not.toMatch(/bg-black\//);
			});

			it(`${file} n'utilise pas bg-primary comme surface de bouton`, () => {
				expect(
					read(file).includes("bg-primary"),
					`${file} repose sur \`bg-primary\` : #fdb8e4 donne 1,60:1 de contraste de bord\n` +
						"contre un fond clair (WCAG 1.4.11 en demande 3:1). Le bord doit être porté\n" +
						"par un anneau d'encre, pas par la couleur de remplissage.",
				).toBe(false);
			});
		}
	});

	describe("3. le chrome bascule au même seuil que le slide", () => {
		it("le slide bascule bien sur md", () => {
			// Sanity : si le slide change de seuil, l'assertion suivante doit être
			// mise à jour plutôt que de passer à vide.
			expect(read("modules/media/components/gallery/slide.tsx")).toContain(
				'useMediaQuery(mediaAtLeast("md"))',
			);
		});

		for (const file of [
			`${GALLERY_DIR}/navigation.tsx`,
			`${GALLERY_DIR}/zoom-button.tsx`,
		] as const) {
			it(`${file} se montre sur md, jamais sur sm`, () => {
				const source = read(file);
				expect(source).toMatch(/\bmd:flex\b/);
				expect(
					/(?<![\w:-])sm:/.test(source),
					`${file} porte un variant \`sm:\`. Le chrome doit basculer sur \`md\`, comme le\n` +
						"slide : sinon la plage 640-767 px (iPad Mini portrait = 744) reçoit le chrome\n" +
						"souris par-dessus un slide tactile.",
				).toBe(false);
			});
		}
	});

	describe("4. le pager mort n'existe plus", () => {
		it("dots.tsx et fraction-badge.tsx ont disparu", () => {
			for (const gone of ["dots.tsx", "fraction-badge.tsx"]) {
				expect(
					existsSync(join(REPO_ROOT, GALLERY_DIR, gone)),
					`${gone} est de retour. Le badge fraction n'avait ni handler ni rôle : il\n` +
						"doublait la bande de vignettes en étant, lui, non interactif.",
				).toBe(false);
			}
		});

		it("le barrel n'exporte plus GalleryDots", () => {
			expect(read(`${GALLERY_DIR}/index.ts`)).not.toContain("GalleryDots");
		});
	});

	describe("5. la réserve basse et son squelette ont la même hauteur", () => {
		// `product-main-skeleton.tsx` REPRODUIT la réserve basse du carton pour éviter
		// le saut de mise en page au streaming. Ce miroir a déjà dérivé une fois (le
		// squelette dessinait le compteur en `top-3 right-3` alors qu'il vivait en
		// `top-3 left-3 … hidden sm:block`) et rien ne l'attrapait.
		//
		// La hauteur, elle, est `md:min-h-11` des deux côtés — et surtout PAS
		// `min-h-11` nu : sous 48rem la réserve ne contient aucune cible tactile (la
		// loupe est `hidden md:flex`, le numéro est un texte `aria-hidden`), donc
		// réserver 44 px y coûtait du vide sur le viewport le plus contraint. Un
		// `min-h-11` remis d'un seul côté rouvre le CLS que ce miroir existe pour
		// éviter.
		const RESERVE_CLASS = "mt-3 flex items-center gap-3 md:min-h-11";

		for (const file of [
			"modules/media/components/gallery/gallery.tsx",
			"modules/products/components/product-main-skeleton.tsx",
		] as const) {
			it(`${file} porte la réserve à la même hauteur`, () => {
				const source = read(file);
				expect(
					source.includes(RESERVE_CLASS),
					`${file} ne porte plus \`${RESERVE_CLASS}\`.\n` +
						"La galerie et son squelette doivent déclarer la MÊME réserve basse, sinon\n" +
						"le passage squelette → contenu décale la page (CLS). Si la hauteur doit\n" +
						"changer, la changer des DEUX côtés.",
				).toBe(true);
			});
		}
	});

	// Le jeton porte `motion-reduce:transform-none`, qui supprime d'un coup
	// `can-hover:hover:scale-105` ET `active:scale-95`. Quand il ne restait que
	// `can-hover:hover:bg-muted`, le seul retour de survol tombait à un écart de
	// 1,19:1 (`--card` → `--muted`) : celui qui a demandé « moins de mouvement »
	// se retrouvait avec le retour le PLUS FAIBLE sur les deux seules commandes
	// desktop de la galerie. Le retour doit donc être porté aussi par une
	// propriété que la préférence ne coupe pas.
	describe("6. le retour de survol ne dépend pas d'un transform", () => {
		const TOKEN_FILE = `${GALLERY_DIR}/token.styles.ts`;

		it("le survol modifie une propriété non-transform", () => {
			const source = read(TOKEN_FILE);

			expect(
				/can-hover:hover:\[--token-ring:/.test(source),
				`${TOKEN_FILE} ne fait plus varier \`--token-ring\` au survol.\n` +
					"Le jeton neutralise ses `scale` sous `motion-reduce` : sans un retour porté\n" +
					"par une autre propriété (ici l'épaisseur du bord d'encre), il ne reste qu'un\n" +
					"écart de remplissage de 1,19:1, soit rien de perceptible.",
			).toBe(true);
		});

		it("l'appui aussi", () => {
			expect(read(TOKEN_FILE)).toMatch(/active:\[--token-ring:/);
		});

		// `can-hover` est un `@custom-variant`, que Tailwind v4 émet APRÈS les variants
		// intégrés : mesuré sur le CSS compilé du dépôt, `.active:…` sort à ~231 000 et
		// `.can-hover:hover:…` à ~334 000. À spécificité égale c'est donc le survol qui
		// gagne — et à la souris `:active` implique toujours `:hover`. Tout état d'appui
		// doit être déclaré DEUX fois : `active:` (tactile) et `can-hover:active:`
		// (~334 362, soit après le survol) pour reprendre la main sur un pointeur fin.
		it("chaque état d'appui est doublé en can-hover:active: (sinon mort à la souris)", () => {
			const source = read(TOKEN_FILE);
			const pressed = [...source.matchAll(/(?<![\w:-])active:([\w[\]:.\-−]+)/g)].map((m) => m[1]);

			expect(pressed.length, "Aucun état d'appui trouvé — le scan a dû casser.").toBeGreaterThan(0);

			for (const value of new Set(pressed)) {
				expect(
					source.includes(`can-hover:active:${value}`),
					`\`active:${value}\` n'a pas de jumeau \`can-hover:active:${value}\`.\n` +
						"Sur un pointeur fin, `can-hover:hover:` est émis APRÈS `active:` et gagne à\n" +
						"spécificité égale : l'état d'appui ne s'appliquerait jamais à la souris.",
				).toBe(true);
			}
		});

		// Une seule déclaration `box-shadow` par état, pilotée par la variable. Deux
		// règles concurrentes (`can-hover:hover:shadow-[…]` + `focus-visible:shadow-[…]`)
		// se disputeraient l'ordre d'émission, et un jeton survolé PENDANT qu'il a le
		// focus pourrait perdre son anneau.
		it("le survol n'écrit pas une seconde règle box-shadow", () => {
			expect(
				/can-hover:hover:shadow-\[/.test(read(TOKEN_FILE)),
				`${TOKEN_FILE} ajoute un \`can-hover:hover:shadow-[…]\`. L'épaisseur doit passer\n` +
					"par `--token-ring` : deux déclarations `box-shadow` sur le même élément\n" +
					"entrent en concurrence avec le sandwich de `focus-visible`.",
			).toBe(false);
		});
	});

	describe("le chrome vit dans la réserve, pas sur la photo", () => {
		for (const file of [`${GALLERY_DIR}/counter.tsx`, `${GALLERY_DIR}/zoom-button.tsx`] as const) {
			it(`${file} ne se positionne pas en absolute`, () => {
				expect(
					/\babsolute\b/.test(read(file)),
					`${file} se repositionne en \`absolute\` : le numéro de vue et la loupe sont\n` +
						"des enfants de la réserve basse du carton, posés par le flux.",
				).toBe(false);
			});
		}
	});
});
