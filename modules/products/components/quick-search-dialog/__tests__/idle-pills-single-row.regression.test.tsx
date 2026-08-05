/**
 * @regression qs-idle-pills-single-row
 *
 * La rangée de catégories du panneau au repos enroulait librement
 * (`flex flex-wrap`). Relevé au navigateur, 390 px de large : **7 catégories sur
 * 3 lignes = 152 px**, dont une dernière ligne portant une seule pilule. C'est
 * plus que le champ de recherche lui-même, et **51 % des 299 px de chrome** posés
 * au-dessus de la zone de contenu — alors que `getQuickSearchData` charge jusqu'à
 * 12 catégories, soit 4 à 5 lignes sur un catalogue complet.
 *
 * Conséquence, clavier ouvert sur mobile (`--vvh` ≈ 508 px) : il ne restait que
 * **209 px pour TOUT le contenu**. Le nuancier (217 px) y était lui-même coupé, et
 * « Vus récemment », « Recherches récentes », « Collections » et le CTA de secours
 * passaient tous sous la ligne de flottaison dès l'ouverture.
 *
 * ⚠️ Le diagnostic d'origine accusait le NUANCIER. La mesure l'a démenti : le mur
 * ne fait que 217 px, et le réduire (`QUICK_SEARCH_MAX_COLORS` 12→8, pastilles
 * plus petites) n'aurait rien rendu. C'est cette rangée qui coûte.
 *
 * Ce que ce test verrouille :
 * - `layout="row"` produit UN rail défilant, pas un enroulement ;
 * - le panneau au repos le demande bien (le composant seul ne le prouve pas) ;
 * - l'état « aucun résultat » garde l'enroulement, qui y est correct.
 *
 * jsdom n'applique aucune feuille de style : la HAUTEUR ne s'y mesure pas. C'est
 * la STRUCTURE qui est verrouillée ici — la hauteur, elle, se revérifie au
 * navigateur (cf. la sonde du lot 5).
 *
 * Audit UI/UX 2026-08-05, lot 5 — mesuré, pas déduit.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: vi.fn() }));

import { QuickTagPills } from "../quick-tag-pills";
import type { QuickSearchProductType } from "../constants";

const productTypes: QuickSearchProductType[] = [
	{ slug: "bagues", label: "Bagues" },
	{ slug: "bracelets", label: "Bracelets" },
	{ slug: "chaines-de-cheveux", label: "Chaînes de cheveux" },
	{ slug: "chaines-de-corps", label: "Chaînes de corps" },
	{ slug: "colliers", label: "Colliers" },
	{ slug: "papilloux", label: "Papilloux" },
	{ slug: "porte-cles", label: "Porte-clés" },
];

/** Retire les commentaires : les correctifs CITENT les motifs qu'on cherche. */
function code(file: string): string {
	return readFileSync(join(__dirname, "..", file), "utf8")
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.replace(/\/\/[^\n]*/g, " ");
}

afterEach(() => {
	cleanup();
});

describe("rangée de catégories — une seule ligne dans le panneau au repos", () => {
	it('`layout="row"` n\'enroule pas', () => {
		render(<QuickTagPills productTypes={productTypes} onSelect={vi.fn()} layout="row" />);

		const group = screen.getByRole("group", { name: /suggestions de catégories/i });
		expect(group).not.toHaveClass("flex-wrap");
	});

	it('`layout="row"` défile horizontalement', () => {
		const { container } = render(
			<QuickTagPills productTypes={productTypes} onSelect={vi.fn()} layout="row" />,
		);

		const scroller = container.querySelector('[data-slot="scroll-fade-container"]');
		expect(scroller).not.toBeNull();
		expect(scroller).toHaveClass("overflow-x-auto");
		// Le rail saigne jusqu'au bord de l'écran : sans opt-out, un défilement au
		// doigt parti de ce bord ouvrirait le menu (`useEdgeSwipe`).
		expect(scroller).toHaveAttribute("data-no-edge-swipe");
	});

	it("les pilules ne se compriment pas dans le rail", () => {
		render(<QuickTagPills productTypes={productTypes} onSelect={vi.fn()} layout="row" />);

		for (const button of screen.getAllByRole("button")) {
			expect(button).toHaveClass("shrink-0");
		}
	});

	it("le panneau au repos demande bien le rail", () => {
		// Le composant seul ne prouve rien : c'est ce call site qui rend les ~100 px.
		// Même forme de garde que `base-ui-state-attrs` pour `defaultTransformAnimation`.
		expect(code("quick-search-dialog.tsx")).toMatch(/<QuickTagPills[\s\S]{0,240}?layout="row"/);
	});

	it("l'état « aucun résultat », lui, garde l'enroulement", () => {
		// Bloc centré dans une colonne étroite : enrouler y est le bon comportement,
		// et il n'y a pas de chrome à économiser.
		const source = code("quick-search-content.tsx");
		expect(source).toMatch(/<QuickTagPills[\s\S]{0,240}?centered/);
		expect(source).not.toMatch(/<QuickTagPills[\s\S]{0,240}?layout="row"/);

		render(<QuickTagPills productTypes={productTypes} onSelect={vi.fn()} size="xs" centered />);
		expect(screen.getByRole("group", { name: /suggestions de catégories/i })).toHaveClass(
			"flex-wrap",
		);
	});
});
