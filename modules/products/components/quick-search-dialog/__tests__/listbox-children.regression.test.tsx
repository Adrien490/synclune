import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { QuickSearchResult } from "@/modules/products/data/quick-search-products";

/**
 * @regression qs-listbox-owns-options-only
 *
 * Un `role="listbox"` ne peut posséder que des `option` et des `group`. Le rôle
 * portait sur le conteneur de résultats entier, qui contient aussi des `<h3>`,
 * un compteur `<p>`, la suggestion orthographique, les messages d'erreur /
 * rate-limit, l'état vide (`role="status"`) et le CTA de pied — tous enfants
 * illégaux, que certains lecteurs d'écran élaguent purement et simplement.
 *
 * Le listbox vit désormais sur un élément interne dédié. Ce test est le garde-fou
 * qui empêche d'y réinsérer un bloc de message : la faute ne produit aucune
 * erreur visible, juste une régression d'accessibilité silencieuse.
 */

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...rest
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: unknown;
	}) => (
		<a href={href} {...rest}>
			{children}
		</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt }: { src: string; alt: string }) => (
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} />
	),
}));

vi.mock("@/shared/components/animations/tap", () => ({
	Tap: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/animations/stagger", () => ({
	Stagger: ({ children, className }: { children: React.ReactNode; className?: string }) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/shared/utils/format-euro", () => ({ formatEuro: (n: number) => `${n / 100} €` }));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/shared/utils/view-transition", () => ({
	withViewTransition: (cb: () => void) => cb(),
}));

vi.mock("@/shared/hooks/use-haptic", () => ({ triggerHaptic: vi.fn(), useHaptic: () => vi.fn() }));

vi.mock("@/modules/products/constants/search-synonyms", () => ({ SEARCH_SYNONYMS: new Map() }));

import { QuickSearchContent } from "../quick-search-content";
import type { QuickSearchCollection, QuickSearchProductType } from "../constants";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const product = {
	id: "p1",
	slug: "bague-lune",
	title: "Bague Lune",
	skus: [
		{
			priceInclTax: 4500,
			compareAtPrice: null,
			inventory: 3,
			position: 0,
			colors: [],
			images: [{ url: "/img/b.jpg", blurDataUrl: null, altText: "Bague" }],
		},
	],
};

const collections: QuickSearchCollection[] = [
	{ slug: "bagues", name: "Bagues", productCount: 4, image: null },
];
const productTypes: QuickSearchProductType[] = [{ slug: "bague", label: "Bagues" }];

const baseProps = {
	query: "bague",
	collections,
	colors: [],
	productTypes,
	onSearch: vi.fn(),
	onClose: vi.fn(),
	onSelectResult: vi.fn(),
	onViewAllResults: vi.fn(),
	onRetry: vi.fn(),
};

function success(
	over: Partial<{ products: unknown[]; suggestion: string | null; totalCount: number }> = {},
) {
	return {
		kind: "success",
		products: over.products ?? [product],
		suggestion: over.suggestion ?? null,
		totalCount: over.totalCount ?? 1,
	} as QuickSearchResult;
}

/** Rôles autorisés comme enfants directs ou indirects d'un listbox. */
const ALLOWED_ROLES = new Set(["option", "group", "presentation", "none"]);

/**
 * Remonte les éléments du listbox porteurs d'un rôle interdit, ou d'un contenu
 * textuel non masqué hors d'une option (titres, compteurs, messages).
 */
function illegalListboxChildren(): string[] {
	const listbox = screen.getByRole("listbox");
	const offenders: string[] = [];

	for (const el of Array.from(listbox.querySelectorAll("*"))) {
		const role = el.getAttribute("role");
		if (role && !ALLOWED_ROLES.has(role)) {
			offenders.push(`<${el.tagName.toLowerCase()} role="${role}">`);
			continue;
		}
		// Un texte visible qui n'est ni dans une option ni masqué casse la
		// sémantique : un listbox n'expose que des options.
		const isHeadingOrText = /^(H[1-6]|P)$/.test(el.tagName);
		const hidden = el.closest("[aria-hidden='true']") !== null;
		const insideOption = el.closest('[role="option"]') !== null;
		if (isHeadingOrText && !hidden && !insideOption) {
			offenders.push(`<${el.tagName.toLowerCase()}> « ${el.textContent.trim().slice(0, 30)} »`);
		}
	}
	return offenders;
}

afterEach(cleanup);

describe("le listbox ne possède que des groupes et des options", () => {
	it("avec produits + collections + catégories correspondantes", () => {
		render(<QuickSearchContent results={success()} {...baseProps} />);
		expect(illegalListboxChildren()).toEqual([]);
	});

	it("avec une suggestion orthographique (rendue HORS du listbox)", () => {
		render(<QuickSearchContent results={success({ suggestion: "bagues" })} {...baseProps} />);

		expect(screen.getByText(/tu voulais dire/i)).toBeInTheDocument();
		expect(screen.getByRole("listbox")).not.toContainElement(
			screen.getByRole("button", { name: /rechercher bagues/i }),
		);
		expect(illegalListboxChildren()).toEqual([]);
	});

	it("à zéro résultat, l'état vide et le CTA sont hors du listbox", () => {
		render(
			<QuickSearchContent
				results={success({ products: [], totalCount: 0 })}
				{...baseProps}
				query="zzzzz"
				collections={[]}
				productTypes={[]}
			/>,
		);

		const listbox = screen.getByRole("listbox");
		expect(listbox).not.toContainElement(screen.getByText(/aucun résultat pour/i));
		expect(listbox).not.toContainElement(
			screen.getByRole("button", { name: /dans tout le catalogue/i }),
		);
		expect(illegalListboxChildren()).toEqual([]);
	});

	it("le CTA et la suggestion sont de vrais boutons, pas des options", () => {
		render(<QuickSearchContent results={success({ suggestion: "bagues" })} {...baseProps} />);

		for (const name of [/voir tous les résultats/i, /rechercher bagues/i]) {
			const btn = screen.getByRole("button", { name });
			expect(btn).not.toHaveAttribute("role", "option");
			// Atteignables au Tab : ce sont des commandes, pas des options du roving.
			expect(btn).not.toHaveAttribute("tabindex", "-1");
		}
	});

	it("chaque option du listbox porte le marqueur de navigation", () => {
		render(<QuickSearchContent results={success()} {...baseProps} />);

		const options = screen.getAllByRole("option");
		expect(options.length).toBeGreaterThan(0);
		for (const opt of options) {
			expect(opt).toHaveAttribute("data-qs-option");
		}
	});
});
