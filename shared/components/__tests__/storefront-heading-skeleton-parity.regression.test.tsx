/**
 * @regression storefront-heading-skeleton-parity
 *
 * Le squelette du bloc titre doit être le miroir AU PIXEL du composant réel.
 *
 * ## Le bug verrouillé
 *
 * Audit du 2026-08-05 : `StorefrontHeadingSkeleton` ne réservait AUCUNE ligne
 * pour la signature « — Léane » (40 px à `sm+` : mt-3 + 1.75rem leading-none),
 * alors que `signature` vaut `true` sur les 5 sites d'appel ; son fantôme de
 * h1 (h-9 sm:h-11 lg:h-12) était plus HAUT que le titre réel à tous les
 * paliers (+12 px à 640 px, le clamp collant à son plancher de 30 px jusqu'à
 * ~937 px de viewport). Net : la page réelle était ~34-38 px plus haute que
 * son squelette sur TOUTES les routes à `loading.tsx` — la grille entière
 * sautait au swap, et `skeleton-card-ratio-parity` ne couvre pas ce skeleton :
 * rien ne pouvait le signaler.
 *
 * ⚠️ **Mise à jour du 2026-08-05 (dégraissage des signatures).** La signature a
 * été retirée du bloc réel — le storefront ne paraphe qu'une fois par page,
 * dans le pied de page. Le test ne compte donc plus 6 lignes mais 5, et
 * l'assertion de géométrie de la signature devient une assertion d'ABSENCE des
 * DEUX côtés. Ce que le test verrouille est inchangé, et c'est là tout son
 * objet : **une ligne retirée d'un seul côté est exactement le même défaut
 * qu'une ligne ajoutée d'un seul côté** — ici, 40 px de CLS en sens inverse.
 *
 * ⚠️ **Mise à jour du 2026-08-06 (retrait du sur-titre).** Même mouvement, même
 * symétrie : « L'atelier de Léane · {ville} » était le défaut des cinq routes
 * boutique, redit par le fil d'Ariane au-dessus et par le chapô en dessous. Il
 * part du bloc réel ET du squelette — 4 lignes à hauteur au lieu de 5, et
 * ~26 px (la ligne h-5 plus le `mt-1.5` du rail, qui n'avait plus rien à
 * séparer). Le sur-titre ne survit que sur la home, hors de ce composant.
 *
 * ## Ce que ce test impose
 *
 * - même nombre de lignes rendues (toutes props actives des deux côtés) ;
 * - le bloc d'accents partage LA MÊME chaîne de classes de marges (constante
 *   commune dans le composant) et la même empreinte de touches ;
 * - chaque ligne du squelette porte la hauteur dérivée de la typo réelle —
 *   la table ci-dessous EST la dérivation ; changer une taille d'un côté doit
 *   faire échouer ce test tant que l'autre n'a pas suivi ;
 * - les marges du rail sont épinglées en LITTÉRAL d'un côté (une régression
 *   symétrique passerait l'égalité seule) et la combinaison sans compteur
 *   (/favoris) a sa propre assertion de parité.
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";

import { StorefrontHeading, StorefrontHeadingSkeleton } from "../storefront-heading";

afterEach(cleanup);

function renderBoth() {
	// `listLabel` ACTIF côté réel : 3 routes sur 4 le passent, et c'était
	// l'angle mort du comptage (audit 79/100 du 2026-08-05) — le h2 `sr-only`
	// est un 6ᵉ enfant SANS hauteur, que le squelette ne doit PAS miroiter.
	const real = render(
		<StorefrontHeading
			title="Les créations"
			description="Chaque pièce à la main."
			descriptionClassName="hidden sm:block"
			countSlot={<span>12 pièces</span>}
			listLabel="Liste des créations"
		/>,
	);
	const skeleton = render(<StorefrontHeadingSkeleton hasDescription hasCount />);
	return {
		realRoot: real.container.firstElementChild as HTMLElement,
		skeletonRoot: skeleton.container.firstElementChild as HTMLElement,
	};
}

/** Les lignes qui OCCUPENT de la hauteur — un `sr-only` n'en occupe aucune. */
function visibleRows(root: HTMLElement): Element[] {
	return Array.from(root.children).filter((child) => !child.className.includes("sr-only"));
}

describe("StorefrontHeadingSkeleton — parité au pixel avec le bloc réel (@regression storefront-heading-skeleton-parity)", () => {
	it("réserve exactement une ligne par ligne réelle À HAUTEUR", () => {
		const { realRoot, skeletonRoot } = renderBoth();

		// rail · h1 · chapô · compteur = 4 lignes à hauteur chacun.
		// Le bloc réel porte en PLUS son h2 `sr-only` (listLabel, 3 routes sur 4) :
		// zéro hauteur, donc PAS de miroir côté squelette — le comparer en brut
		// aurait exigé une ligne fantôme. C'était 6 lignes tant que le bloc
		// signait, 5 tant qu'il sur-titrait ; les deux sont parties DES DEUX CÔTÉS.
		expect(realRoot.children).toHaveLength(5);
		expect(visibleRows(realRoot)).toHaveLength(4);
		expect(visibleRows(skeletonRoot)).toHaveLength(visibleRows(realRoot).length);
	});

	it("le bloc d'accents a les mêmes marges et la même empreinte des deux côtés", () => {
		const { realRoot, skeletonRoot } = renderBoth();

		// Par INDEX de ligne, pas par [aria-hidden] : chaque ligne `Skeleton` est
		// elle-même un div aria-hidden — le sélecteur en attraperait une autre.
		// Le bloc d'accents est la PREMIÈRE ligne depuis le retrait du sur-titre.
		const realRail = realRoot.children[0] as HTMLElement;
		const skeletonRail = skeletonRoot.children[0] as HTMLElement;

		// La chaîne vient d'une constante partagée (RAIL_WRAPPER_CLASS) : si l'un
		// des deux s'en écarte, la hauteur du bloc diverge et le swap saute.
		expect(skeletonRail.className).toBe(realRail.className);
		// … et la constante elle-même est épinglée d'UN côté : l'égalité seule
		// laisserait passer une régression symétrique (les deux marges changent
		// ensemble et le CLS revient à l'identique). ⚠️ Plus de marge HAUTE depuis
		// le retrait du sur-titre : le rail ouvre le bloc, et l'écart au fil
		// d'Ariane vient du `space-y-5` du conteneur de page.
		expect(realRail.className).toBe("mb-2 flex sm:mb-3");

		// Même empreinte de touches : le SVG du squelette est celui du composant
		// (statique, atténué), pas une réécriture qui dériverait.
		const realSvg = realRail.querySelector("svg")!;
		const skeletonSvg = skeletonRail.querySelector("svg")!;
		expect(skeletonSvg.getAttribute("viewBox")).toBe(realSvg.getAttribute("viewBox"));
		for (const width of ["w-32", "sm:w-36", "lg:w-44"]) {
			expect(realSvg.getAttribute("class")).toContain(width);
			expect(skeletonSvg.getAttribute("class")).toContain(width);
		}
		// Statique côté squelette : un squelette qui rejoue le dessin ferait
		// dessiner les touches deux fois (squelette puis page).
		expect(skeletonSvg.querySelector("path")!.getAttribute("class")).not.toContain(
			"hand-draw-load",
		);
	});

	it("chaque ligne du squelette porte la hauteur dérivée de la typo réelle", () => {
		const { skeletonRoot } = renderBoth();
		const rows = skeletonRoot.children;

		// La table de dérivation — interligne racine 1.5 (preflight Tailwind).
		// L'index 0 est le bloc d'accents (le sur-titre qui l'occupait est parti
		// le 2026-08-06, des deux côtés) :
		//   h1         clamp plancher 30 px × leading 1.06 ≈ 32 px → h-8,
		//              ~35 px à lg → lg:h-9, ~44 px à xl → xl:h-11
		//   chapô      16 px × 1.625 (leading-relaxed) = 26 px → h-[1.625rem]
		//   compteur   15 px × 1.5 ≈ 22 px → h-[1.375rem], 16 px × 1.5 = 24 → sm:h-6
		const expected: Array<[index: number, classes: string[]]> = [
			[1, ["h-8", "lg:h-9", "xl:h-11"]],
			[2, ["mt-3", "hidden", "h-[1.625rem]", "sm:block"]],
			[3, ["mt-2", "h-[1.375rem]", "sm:h-6"]],
		];

		for (const [index, classes] of expected) {
			for (const cls of classes) {
				expect(rows[index]!.className, `ligne ${index} — ${cls}`).toContain(cls);
			}
		}

		// L'ancien fantôme de h1, plus haut que le vrai titre à tous les paliers.
		expect(rows[1]!.className).not.toContain("sm:h-11");
		expect(rows[1]!.className).not.toContain("lg:h-12");
	});

	it("ne réserve AUCUNE ligne de sur-titre — parce que le bloc réel n'en rend plus", () => {
		const { realRoot, skeletonRoot } = renderBoth();

		// Symétrique du retrait de la signature, et même défaut au signe près : un
		// squelette qui garderait la barre `h-5` du sur-titre ferait sauter la page
		// vers le HAUT au swap (~26 px avec le `mt-1.5` que le rail portait sous
		// lui). Le bloc réel n'a plus de `<p>` avant les touches.
		expect(realRoot.querySelector("p:first-child")).toBeNull();
		expect(Array.from(skeletonRoot.children).some((row) => row.className.includes("h-5"))).toBe(
			false,
		);
	});

	it("ne réserve AUCUNE ligne de signature — parce que le bloc réel n'en rend plus", () => {
		const { realRoot, skeletonRoot } = renderBoth();

		// Le retrait doit être symétrique. Un squelette qui garderait les 40 px de
		// la signature (mt-3 + 1.75rem/none à `sm+`) produirait exactement le même
		// CLS que le défaut d'origine, au signe près : la page réelle SAUTERAIT
		// vers le haut au swap au lieu de sauter vers le bas.
		expect(realRoot.querySelector(".font-cursive")).toBeNull();
		expect(
			Array.from(realRoot.querySelectorAll("p")).some((p) => p.textContent === "— Léane"),
		).toBe(false);
		// Aucune ligne fantôme de 28 px masquée sous `sm` côté squelette.
		expect(Array.from(skeletonRoot.children).some((row) => row.className.includes("h-7"))).toBe(
			false,
		);
	});

	it("hasCount={false} reflète une page sans compteur — le cas réel de /favoris", () => {
		// /favoris ne passe pas de countSlot (le compteur optimiste vit dans la
		// liste) et son loading.tsx passe hasCount={false} : cette combinaison
		// n'était couverte par AUCUNE assertion — un désalignement propre à cette
		// route serait passé sous le test « toutes lignes actives ».
		const real = render(
			<StorefrontHeading
				title="Mes favoris"
				description="Tes pièces mises de côté."
				descriptionClassName="hidden sm:block"
				listLabel="Liste des favoris"
			/>,
		);
		const skeleton = render(<StorefrontHeadingSkeleton hasCount={false} />);

		const realRoot = real.container.firstElementChild as HTMLElement;
		const skeletonRoot = skeleton.container.firstElementChild as HTMLElement;

		// rail · h1 · chapô = 3 lignes à hauteur chacun (+ le h2 sr-only côté
		// réel, sans miroir — cf. le premier test).
		expect(visibleRows(realRoot)).toHaveLength(3);
		expect(visibleRows(skeletonRoot)).toHaveLength(visibleRows(realRoot).length);
	});

	it("descriptionLines={2} réserve DEUX barres de 26 px — le chapô long des copies statiques", () => {
		// /produits, /collections et /favoris rendent une copie statique de
		// 95-117 caractères : DEUX lignes dans le max-w-[42ch] (447 px) à `sm+`.
		// Le squelette n'en réservait qu'UNE — 26 px de CLS au swap, invisibles à
		// jsdom (qui ne layoute pas) : mesuré au navigateur, audit 79/100 du
		// 2026-08-05. La valeur par ROUTE est épinglée chez chaque loading.tsx ;
		// ici on épingle la géométrie du cas 2 lignes.
		const { container } = render(<StorefrontHeadingSkeleton descriptionLines={2} />);
		const rows = visibleRows(container.firstElementChild as HTMLElement);

		// Toujours 4 lignes à hauteur : les deux barres partagent la ligne chapô.
		expect(rows).toHaveLength(4);
		const chapo = rows[2] as HTMLElement;
		// Le wrapper porte la marge et le masquage mobile du <p> réel…
		for (const cls of ["mt-3", "hidden", "sm:block"]) {
			expect(chapo.className, `wrapper — ${cls}`).toContain(cls);
		}
		// … et chaque barre fait UNE hauteur d'interligne (16 px × 1.625) : deux
		// boîtes de ligne accolées, comme le texte réel qu'elles réservent.
		const bars = Array.from(chapo.children) as HTMLElement[];
		expect(bars).toHaveLength(2);
		for (const bar of bars) {
			expect(bar.className).toContain("h-[1.625rem]");
		}
	});

	it("accent='mono' réserve une barre neutre de même empreinte que la touche unique", () => {
		const { container } = render(<StorefrontHeadingSkeleton accent="mono" />);

		// Ligne 0 = bloc d'accents (cf. note sur [aria-hidden] plus haut).
		const rail = (container.firstElementChild as HTMLElement).children[0] as HTMLElement;
		// Pas de SVG coloré : un loading.tsx ne connaît pas le slug, donc pas la
		// couleur — quatre couleurs qui se ravisent en une au swap étaient le
		// flash chromatique de l'audit.
		expect(rail.querySelector("svg")).toBeNull();
		const bar = rail.firstElementChild as HTMLElement;
		for (const cls of ["h-3", "w-32", "rounded-full", "sm:w-36", "lg:w-44"]) {
			expect(bar.className).toContain(cls);
		}
	});
});
