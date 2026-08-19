/**
 * @regression qs-color-wall-outside-listbox
 *
 * Le mur de couleurs (direction « C — Le nuancier », 2026-08-05) ajoute une
 * douzaine de liens au panneau. Il tombe donc pile sur l'invariant le plus
 * durement acquis de cette surface, celui sur lequel trois audits ont convergé :
 * **`data-qs-option` est le marqueur de NAVIGATION, `role="option"` le marqueur
 * ARIA, et les deux sont délibérément distincts** (cf. `constants.ts`).
 *
 * Deux façons de le casser, toutes deux silencieuses :
 *
 * 1. **Poser `role="option"` sur les pastilles.** En idle le conteneur n'est PAS
 *    un `listbox` (décision F3 du 2026-05-29) : les options y seraient
 *    orphelines, sans propriétaire, et certains lecteurs d'écran les élaguent.
 * 2. **Laisser `data-qs-option` sur le mur de l'état « aucun résultat ».** Ce
 *    mur-là est rendu HORS du `role="listbox"`, en mode RECHERCHE — où le roving
 *    désigne l'option courante par `aria-activedescendant`. Un nœud navigable
 *    extérieur au listbox ferait pointer cet attribut hors du widget qui le
 *    porte. D'où la prop `navigable`.
 *
 * Aucun outil ne voit ça : `useKeyboardNavigation` indexe simplement ce qui
 * matche `FOCUSABLE_SELECTOR`, sans se demander où ça vit.
 */
import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// ─── Module mocks ────────────────────────────────────────────────────────────

// `replace` est une prop de `next/link`, pas un attribut DOM : React la
// jetterait silencieusement d'un `<a>`. On la reporte en `data-replace` pour
// pouvoir l'assert — c'est bien la prop reçue par `Link` qui est vérifiée.
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		replace,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		replace?: boolean;
		[key: string]: unknown;
	}) => (
		<a href={href} data-replace={replace ? "" : undefined} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/shared/components/animations/stagger", () => ({
	Stagger: ({
		children,
		className,
		as: Container = "div",
		itemAs: ItemTag = "div",
	}: {
		children: React.ReactNode;
		className?: string;
		as?: "div" | "ul";
		itemAs?: "div" | "li";
	}) => (
		<Container className={className}>
			{React.Children.map(children, (child, index) => (
				<ItemTag key={index}>{child}</ItemTag>
			))}
		</Container>
	),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: vi.fn() }));

// ─── Import after mocks ──────────────────────────────────────────────────────

import { ColorWall } from "../color-wall";
import { FOCUSABLE_SELECTOR } from "../constants";
import type { QuickSearchColor } from "../constants";

const colors: QuickSearchColor[] = [
	{ slug: "framboise", name: "Framboise", hex: "#F0568F" },
	{ slug: "citron", name: "Citron", hex: "#F5CF3C" },
	{ slug: "or-blanc", name: "Or blanc", hex: "#F5F5F5" },
];

afterEach(cleanup);

describe("ColorWall", () => {
	it("ne rend RIEN sans couleur (la garde de seuil vit côté serveur)", () => {
		const { container } = render(<ColorWall colors={[]} onSelect={vi.fn()} />);

		expect(container).toBeEmptyDOMElement();
	});

	it("sort vers le filtre couleur du catalogue", () => {
		const { container } = render(<ColorWall colors={colors} onSelect={vi.fn()} />);

		expect(container.querySelector('a[href="/produits?color=framboise"]')).toBeInTheDocument();
		expect(container.querySelector('a[href="/produits?color=or-blanc"]')).toBeInTheDocument();
	});

	/**
	 * Toutes les sorties du panneau naviguent en `replace` : l'entrée d'historique
	 * poussée à l'ouverture porte l'URL de la page d'origine, et ne pas la
	 * consommer avale une pression retour par cycle ouvrir→naviguer.
	 * Cf. `close-reclaims-history.regression.test.tsx`.
	 */
	it("navigue en `replace`, comme toutes les sorties du panneau", () => {
		const { container } = render(<ColorWall colors={colors} onSelect={vi.fn()} />);

		for (const link of container.querySelectorAll("a")) {
			expect(link).toHaveAttribute("data-replace");
		}
	});

	// ─── L'invariant ──────────────────────────────────────────────────────────

	it("n'expose AUCUNE `option` ni listbox", () => {
		render(<ColorWall colors={colors} onSelect={vi.fn()} />);

		expect(screen.queryAllByRole("option")).toHaveLength(0);
		expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
	});

	it("marque les pastilles navigables par défaut", () => {
		const { container } = render(<ColorWall colors={colors} onSelect={vi.fn()} />);

		expect(container.querySelectorAll(FOCUSABLE_SELECTOR)).toHaveLength(colors.length);
	});

	it("ne marque RIEN quand `navigable` est faux (mur hors listbox, mode recherche)", () => {
		const { container } = render(
			<ColorWall colors={colors} onSelect={vi.fn()} navigable={false} />,
		);

		expect(container.querySelectorAll(FOCUSABLE_SELECTOR)).toHaveLength(0);
		// …et les liens restent atteignables au Tab, eux : ils ne sortent pas du
		// parcours clavier, ils sortent du ROVING.
		expect(container.querySelectorAll("a")).toHaveLength(colors.length);
		for (const link of container.querySelectorAll("a")) {
			expect(link).not.toHaveAttribute("tabindex", "-1");
		}
	});

	// ─── Lisibilité des teintes ──────────────────────────────────────────────

	/**
	 * Quatre des huit teintes de la base sont quasi blanches (#F5F5F5, #FDEEF4,
	 * #E8F4F8, #C0C0C0) : sans un vrai bord, la pastille disparaît sur le fond du
	 * panneau. Le liseré interne des teintes franches, lui, suffirait à peine.
	 */
	it("donne un bord plein aux teintes quasi blanches, un liseré aux autres", () => {
		const { container } = render(<ColorWall colors={colors} onSelect={vi.fn()} />);
		const swatches = container.querySelectorAll('span[aria-hidden="true"]');

		const pale = swatches[2]; // Or blanc
		const vivid = swatches[0]; // Framboise

		expect(pale?.className).toContain("border-border");
		expect(vivid?.className).toContain("ring-inset");
	});

	/**
	 * ⚠️ `size-*` sur un `<span>` INLINE est inerte — la boîte inline n'a ni
	 * largeur ni hauteur. Le piège a déjà coûté un audit (panneau de filtres,
	 * 2026-08-05) et ne se voit qu'au rendu réel, jamais en jsdom.
	 */
	it("rend la pastille en `block` — sinon `size-*` ne fait rien", () => {
		const { container } = render(<ColorWall colors={colors} onSelect={vi.fn()} />);
		const swatch = container.querySelector('span[aria-hidden="true"]');

		expect(swatch?.className).toContain("block");
		expect(swatch?.className).toContain("size-14");
	});

	/** Le nom vit SOUS la pastille : aucune teinte n'est lisible sous du texte. */
	it("écrit le nom hors de la pastille", () => {
		render(<ColorWall colors={colors} onSelect={vi.fn()} />);
		const label = screen.getByText("Framboise");

		expect(label.getAttribute("aria-hidden")).toBeNull();
		expect(label.querySelector("span")).toBeNull();
	});
});
